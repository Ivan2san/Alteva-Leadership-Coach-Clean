import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageCircle, ArrowRight } from "lucide-react";
import type { TopicPrompt } from "@/lib/topic-configurations";

interface PromptCardProps {
  prompt: TopicPrompt;
  index: number;
  onClick: (promptText: string) => void;
}

export default function PromptCard({ prompt, index, onClick }: PromptCardProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          className="w-full bg-card hover:bg-accent/5 border border-border rounded-lg p-5 text-left transition-all duration-200 button-hover group min-h-[160px] h-auto"
          onClick={() => onClick(prompt.text)}
          data-testid={`button-prompt-${index}`}
        >
          <div className="flex items-start space-x-3 w-full">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
              <MessageCircle className="text-primary text-xs" size={12} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-accent truncate">{prompt.category}</span>
                <ArrowRight className="text-muted-foreground group-hover:text-foreground transition-colors text-xs flex-shrink-0" size={12} />
              </div>
              <p className="text-sm text-foreground leading-relaxed text-left">
                {prompt.text}
              </p>
            </div>
          </div>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-3">
        <div className="space-y-1">
          <p className="text-xs font-medium">{prompt.category}</p>
          <p className="text-xs text-muted-foreground">{prompt.text}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
