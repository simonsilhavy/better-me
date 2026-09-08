// Split out so client components can import the cadence without pulling the
// database client into the browser bundle.
export const HEARTBEAT_MS = 45_000;
