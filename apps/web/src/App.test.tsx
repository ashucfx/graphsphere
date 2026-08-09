/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";
import "@testing-library/jest-dom/vitest";

describe("App", () => {
  it("renders the login workflow first", () => {
    render(<App />);
    expect(screen.getByText("GraphSphere")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });
});
