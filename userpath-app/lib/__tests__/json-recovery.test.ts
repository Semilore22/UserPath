import { describe, it, expect } from 'vitest';
import { looseJsonParse } from '@/lib/json-recovery';

describe('looseJsonParse', () => {
  it('parses valid JSON directly', () => {
    const result = looseJsonParse('{"a":1,"b":"hello"}');
    expect(result).toEqual({ a: 1, b: 'hello' });
  });

  it('extracts JSON from code block', () => {
    const result = looseJsonParse('```json\n{"a":1}\n```');
    expect(result).toEqual({ a: 1 });
  });

  it('extracts JSON from code block without language tag', () => {
    const result = looseJsonParse('```\n{"a":1}\n```');
    expect(result).toEqual({ a: 1 });
  });

  it('handles trailing commas in objects', () => {
    const result = looseJsonParse('{"a":1,"b":2,}');
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('handles trailing commas in arrays', () => {
    const result = looseJsonParse('{"items":[1,2,3,]}');
    expect(result).toEqual({ items: [1, 2, 3] });
  });

  it('handles unquoted keys', () => {
    const result = looseJsonParse('{key:"value"}');
    expect(result).toEqual({ key: 'value' });
  });

  it('handles single-quoted string values', () => {
    const result = looseJsonParse(`{"a":'hello'}`);
    expect(result).toEqual({ a: 'hello' });
  });

  it('handles single-quoted strings after commas in arrays', () => {
    const result = looseJsonParse(`{"items":[1,'two',3]}`);
    expect(result).toEqual({ items: [1, 'two', 3] });
  });

  it('handles mixed issues: unquoted keys, trailing commas, single quotes', () => {
    const raw = `{name:'Test',items:[1,2,3,],active:true,}`;
    const result = looseJsonParse(raw);
    expect(result).toEqual({ name: 'Test', items: [1, 2, 3], active: true });
  });

  it('handles nested objects with unquoted keys', () => {
    const raw = `{user:{name:'Alice',age:30}}`;
    const result = looseJsonParse(raw);
    expect(result).toEqual({ user: { name: 'Alice', age: 30 } });
  });

  it('handles empty object', () => {
    const result = looseJsonParse('{}');
    expect(result).toEqual({});
  });

  it('handles empty array', () => {
    const result = looseJsonParse('[]');
    expect(result).toEqual([]);
  });

  it('handles boolean and null values', () => {
    const result = looseJsonParse('{"a":true,"b":false,"c":null}');
    expect(result).toEqual({ a: true, b: false, c: null });
  });
});
