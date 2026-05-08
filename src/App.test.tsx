import { render, screen } from "@testing-library/react";
import App from "./App";

test("smoke: app renders", () => {
  render(<App />);
  expect(screen.getByText(/hello tailwind/i)).toBeInTheDocument();
});
