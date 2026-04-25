/**
 * Returns true if the current local time is considered "night" based on season.
 *
 * Summer (Apr–Sep, months 4–9):
 *   night = before 06:30 or at/after 21:30
 *
 * Winter (Oct–Mar, months 1–3 and 10–12):
 *   night = before 07:30 or at/after 17:30
 */
export function getNightModeAuto(): boolean {
  const now = new Date();
  const month = now.getMonth() + 1; // 1–12
  const totalMinutes = now.getHours() * 60 + now.getMinutes();

  const isSummer = month >= 4 && month <= 9;

  if (isSummer) {
    return totalMinutes < 6 * 60 + 30 || totalMinutes >= 21 * 60 + 30;
  } else {
    return totalMinutes < 7 * 60 + 30 || totalMinutes >= 17 * 60 + 30;
  }
}
