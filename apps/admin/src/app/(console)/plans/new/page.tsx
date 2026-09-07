import { PlanForm } from '../plan-form';

export default function AdminNewPlanPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">New plan</h1>
      <p className="mt-2 text-sm text-slate-400">The API stores the plan, features, add-ons and city prices.</p>
      <PlanForm />
    </div>
  );
}
