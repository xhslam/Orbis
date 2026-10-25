/** Only the newest open may publish a result; resting also invalidates it. */
export function createOpenGeneration() {
  let generation = 0
  return {
    begin(): () => boolean {
      const mine = ++generation
      return () => mine === generation
    },
    cancel(): void {
      generation += 1
    },
  }
}
