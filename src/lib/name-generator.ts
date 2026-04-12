import {
  uniqueNamesGenerator,
  adjectives,
  animals,
} from "unique-names-generator";

export function generateTestClockName(): string {
  const base = uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    separator: "-",
    style: "lowerCase",
    length: 2,
  });
  return `${base}-test-clock`;
}
