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
}
