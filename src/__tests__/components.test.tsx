import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

// ========== BUTTON ==========
describe("Button", () => {
  it("should render with children text", () => {
    render(<Button>Kaydet</Button>);
    expect(screen.getByRole("button", { name: "Kaydet" })).toBeInTheDocument();
  });

  it("should be disabled when disabled prop is true", () => {
    render(<Button disabled>Kaydet</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("should be disabled when loading", () => {
    render(<Button loading>Kaydet</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("should show spinner when loading", () => {
    render(<Button loading>Kaydet</Button>);
    const svg = document.querySelector("svg.animate-spin");
    expect(svg).toBeInTheDocument();
  });

  it("should apply primary variant classes by default", () => {
    render(<Button>Test</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-emerald-600");
  });

  it("should apply danger variant classes", () => {
    render(<Button variant="danger">Sil</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-red-500");
  });

  it("should apply size classes", () => {
    render(<Button size="lg">Büyük</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("px-6");
  });

  it("should forward additional props", () => {
    render(<Button type="submit" data-testid="btn">OK</Button>);
    const btn = screen.getByTestId("btn");
    expect(btn).toHaveAttribute("type", "submit");
  });
});

// ========== BADGE ==========
describe("Badge", () => {
  it("should render children", () => {
    render(<Badge>Açık</Badge>);
    expect(screen.getByText("Açık")).toBeInTheDocument();
  });

  it("should apply default gray variant", () => {
    render(<Badge>Test</Badge>);
    const badge = screen.getByText("Test");
    expect(badge.className).toContain("bg-gray-100");
  });

  it("should apply emerald variant", () => {
    render(<Badge variant="emerald">Yeşil</Badge>);
    const badge = screen.getByText("Yeşil");
    expect(badge.className).toContain("bg-emerald-100");
  });

  it("should apply size sm by default", () => {
    render(<Badge>Küçük</Badge>);
    const badge = screen.getByText("Küçük");
    expect(badge.className).toContain("text-xs");
  });

  it("should apply size md", () => {
    render(<Badge size="md">Orta</Badge>);
    const badge = screen.getByText("Orta");
    expect(badge.className).toContain("text-sm");
  });
});
