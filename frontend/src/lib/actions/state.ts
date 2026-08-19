/**
 * Shared shape every Server Action in lib/actions/** resolves to, designed for
 * `useActionState` — see e.g. app/(app)/groups/new/page.tsx for the client side.
 *
 * An action either throws (a bug) or returns one of these; there is no third
 * "silent failure" path. `fieldErrors` mirrors the backend's own
 * `ErrorResponse.validationErrors`, so a 400 from bean validation renders exactly
 * like a client-side form error.
 *
 * Deliberately a flat interface rather than a discriminated union keyed on
 * `status`: every form reads `state.fieldErrors?.someField` unconditionally
 * (before knowing whether the state is even "error"), and a union would force
 * a `status === "error"` narrowing check at every one of those call sites for
 * no benefit — `fieldErrors` is already optional and simply absent on idle.
 */
export interface ActionState {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
}

export const IDLE_STATE: ActionState = { status: "idle" };
