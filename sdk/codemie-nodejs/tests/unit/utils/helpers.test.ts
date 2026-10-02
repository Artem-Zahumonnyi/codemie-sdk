import { describe, it, expect } from "@jest/globals";
import { omitUndefined } from "../../../src/utils/helpers";

describe("omitUndefined", () => {
  it("should remove properties with undefined values from an object", () => {
    // Arrange
    const input = {
      name: "test",
      age: undefined,
      city: "New York",
      country: undefined,
    };

    // Act
    const result = omitUndefined(input);

    // Assert
    expect(result).toEqual({
      name: "test",
      city: "New York",
    });
  });

  it("should not modify object without undefined values", () => {
    // Arrange
    const input = {
      name: "test",
      age: 25,
      city: "New York",
    };

    // Act
    const result = omitUndefined(input);

    // Assert
    expect(result).toEqual(input);
  });

  it("should handle empty object", () => {
    // Arrange
    const input = {};

    // Act
    const result = omitUndefined(input);

    // Assert
    expect(result).toEqual({});
  });

  it("should handle object with all undefined values", () => {
    // Arrange
    const input = {
      name: undefined,
      age: undefined,
      city: undefined,
    };

    // Act
    const result = omitUndefined(input);

    // Assert
    expect(result).toEqual({});
  });

  it("should preserve null values", () => {
    // Arrange
    const input = {
      name: "test",
      age: null,
      city: undefined,
    };

    // Act
    const result = omitUndefined(input);

    // Assert
    expect(result).toEqual({
      name: "test",
      age: null,
    });
  });

  it("should handle nested objects", () => {
    // Arrange
    const input = {
      name: "test",
      details: {
        age: undefined,
        city: "New York",
      },
      contacts: undefined,
    };

    // Act
    const result = omitUndefined(input);

    // Assert
    expect(result).toEqual({
      name: "test",
      details: {
        age: undefined,
        city: "New York",
      },
    });
  });
});
