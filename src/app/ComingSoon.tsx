type Props = { domain: "anime" | "game" | "book" };

export function ComingSoon({ domain }: Readonly<Props>) {
  return <h1 className="text-2xl">Coming soon: {domain}</h1>;
}
