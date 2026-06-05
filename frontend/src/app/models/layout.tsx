import { SmartResultsPrompt } from "@/components/smart-results-prompt";

export default function ModelsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SmartResultsPrompt />
    </>
  );
}
