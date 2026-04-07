import { PolicyContentBlock } from "../types/policy";

interface PolicyContentRendererProps {
  content: PolicyContentBlock[];
}

export function PolicyContentRenderer({ content }: PolicyContentRendererProps) {
  return (
    <>
      {content.map((block, blockIndex) => (
        <section key={blockIndex}>
          <h2 className="text-2xl font-semibold mb-4">{block.title}</h2>
          <div className="text-muted-foreground space-y-3">
            {block.sections.map((item, itemIndex) => {
              const indent =
                item.level === 0
                  ? ""
                  : item.level === 1
                  ? "pl-6"
                  : "pl-12";

              return (
                <p key={itemIndex} className={indent}>
                  {item.text}
                </p>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
