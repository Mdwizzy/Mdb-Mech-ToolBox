import { corsHeaders, requireAdmin } from '../_shared/auth.ts';

const logic: Record<string, (v: number[]) => number> = {
  pump_hydraulic_power: (v) => (v[0] / 3600) * v[1] * v[2] * 9.80665,
  pressure_from_force: (v) => v[0] / v[1],
  pipe_flow_rate: (v) => Math.PI * (v[0] / 1000) ** 2 / 4 * v[1],
  darcy_weisbach: (v) => v[0] * (v[1] / v[2]) * (v[3] * v[4] ** 2 / 2),
  reynolds_number: (v) => v[0] * v[1] * v[2] / v[3],
  shaft_power: (v) => v[0] * 2 * Math.PI * v[1] / 60,
  thermal_expansion: (v) => v[0] * v[1] * v[2],
  heat_duty: (v) => v[0] * v[1] * v[2],
  lmtd: (v) => Math.abs(v[0] - v[1]) < 1e-12 ? v[0] : (v[0] - v[1]) / Math.log(v[0] / v[1]),
  bearing_life: (v) => (v[0] / v[1]) ** v[2],
};
const inputLengths: Record<string, number> = { pump_hydraulic_power:3,pressure_from_force:2,pipe_flow_rate:2,darcy_weisbach:5,reynolds_number:4,shaft_power:2,thermal_expansion:3,heat_duty:3,lmtd:2,bearing_life:3 };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { user, adminClient } = await requireAdmin(req);
    const { action, calculator_id, name, inputs, expected } = await req.json();
    const { data: calculator, error } = await adminClient.from('calculators').select('id,logic_id,verification_status').eq('id', calculator_id).single();
    if (error || !calculator) throw new Error('Calculator was not found.');
    if (action === 'run_test') {
      if (!Array.isArray(inputs) || inputs.length < 1 || !inputs.every((n) => typeof n === 'number' && Number.isFinite(n))) throw new Error('Inputs must be a finite numeric array.');
      if (typeof expected !== 'number' || !Number.isFinite(expected)) throw new Error('Expected output must be a finite number.');
      const calculate = logic[calculator.logic_id];
      if (!calculate) throw new Error('This calculator does not use an approved calculation logic module.');
      if (inputs.length !== inputLengths[calculator.logic_id]) throw new Error('Input count does not match the approved calculator definition.');
      if ((calculator.logic_id === 'pump_hydraulic_power' && (inputs[0] < 0 || inputs[1] < 0 || inputs[2] <= 0)) || (calculator.logic_id === 'pressure_from_force' && inputs[1] <= 0) || (calculator.logic_id === 'pipe_flow_rate' && inputs[0] <= 0) || (calculator.logic_id === 'darcy_weisbach' && (inputs[1] < 0 || inputs[2] <= 0 || inputs[3] <= 0)) || (calculator.logic_id === 'reynolds_number' && (inputs[2] <= 0 || inputs[3] <= 0)) || (calculator.logic_id === 'lmtd' && (inputs[0] <= 0 || inputs[1] <= 0)) || (calculator.logic_id === 'bearing_life' && (inputs[0] < 0 || inputs[1] <= 0))) throw new Error('Test inputs violate the calculation domain.');
      const actual = calculate(inputs);
      if (!Number.isFinite(actual)) throw new Error('Test inputs produced an invalid output.');
      const tolerance = Math.max(1e-12, Math.abs(expected) * 1e-6);
      const passed = Math.abs(actual - expected) <= tolerance;
      const { error: insertError } = await adminClient.from('calculator_test_cases').insert({ calculator_id, name: String(name || 'Test case').slice(0,120), inputs, expected, tolerance, actual, passed, tested_by: user.id, tested_at: new Date().toISOString(), logic_id_at_test: calculator.logic_id });
      if (insertError) throw insertError;
      await adminClient.from('admin_audit_log').insert({ administrator_id:user.id,action:'CALCULATOR_TEST_RUN',resource_type:'calculator_test_cases',resource_id:calculator_id,details:{logic_id:calculator.logic_id,name,inputs,expected,actual,passed} });
      return Response.json({ actual, expected, passed, tolerance }, { headers: corsHeaders });
    }
    if (action === 'verify') {
      const { data: tests, error: testsError } = await adminClient.from('calculator_test_cases').select('passed,logic_id_at_test').eq('calculator_id', calculator_id);
      if (testsError) throw testsError;
      const currentTests = (tests || []).filter((test) => test.logic_id_at_test === calculator.logic_id);
      const verified = currentTests.length > 0 && currentTests.every((test) => test.passed === true);
      const status = verified ? 'verified' : currentTests.length ? 'needs_review' : 'under_review';
      const { error: updateError } = await adminClient.from('calculators').update({ verification_status: status, verified_at: verified ? new Date().toISOString() : null }).eq('id', calculator_id);
      if (updateError) throw updateError;
      await adminClient.from('admin_audit_log').insert({ administrator_id: user.id, action: verified ? 'CALCULATOR_VERIFIED' : 'CALCULATOR_REVIEW_STATUS', resource_type: 'calculators', resource_id: calculator_id, details: { logic_id: calculator.logic_id, tests: currentTests.length, status } });
      return Response.json({ status, message: verified ? 'All recorded current-logic tests passed.' : 'At least one passing test is required for the current logic version.' }, { headers: corsHeaders });
    }
    throw new Error('Unknown verification action.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed.';
    const status = message.includes('Sign in') || message.includes('session') ? 401 : message.includes('Administrator') ? 403 : 400;
    return Response.json({ error: message }, { status, headers: corsHeaders });
  }
});
