import type { CollectionEntry } from 'astro:content';
import * as packageBoundary from 'astro-loader-craft-do';

// Resolves the workspace package's emitted declarations, not a src/ alias.
void packageBoundary;

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true : false;
type Assert<T extends true> = T;
type Article = CollectionEntry<'articles'>;

// These fail if schema inference regresses to any or loses its precise output.
export type InferenceChecks = [
  Assert<Equal<Article['data']['title'], string>>,
  Assert<Equal<Article['data']['properties']['status'], 'draft' | 'published'>>,
  Assert<Equal<Article['data']['properties']['tags'], string[]>>,
  Assert<Equal<Article['data']['properties']['description'], string | undefined>>,
];
