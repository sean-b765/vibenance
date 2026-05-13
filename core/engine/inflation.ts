export const realValue = (nominal: number, inflationRate: number, years: number): number =>
  nominal / (1 + inflationRate) ** years
