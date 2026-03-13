export class Random {
  static pickOne<T>(arr: T[]): T {
    const randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
  }

  static range(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  static rangeInt(min: number, max: number): number {
    return Math.floor(Random.range(min, max + 1));
  }

  static chance(probability: number): boolean {
    return Math.random() < probability;
  }

  static uuid(): string {
    return crypto.randomUUID();
  }

  /** Box-Muller transform for gaussian distribution */
  static gaussian(mean: number, stddev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stddev;
  }
}
