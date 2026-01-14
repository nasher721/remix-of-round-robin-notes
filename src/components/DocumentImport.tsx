import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FileText, FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import mammoth from "mammoth";

interface DocumentImportProps {
  onImport: (content: string) => void;
  disabled?: boolean;
}

export const DocumentImport = ({ onImport, disabled }: DocumentImportProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const acceptedTypes = useRef<string>("");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setOpen(false);

    try {
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith(".txt")) {
        // Handle plain text files
        const text = await file.text();
        // Convert line breaks to HTML
        const htmlContent = text
          .split("\n")
          .map(line => line || "<br>")
          .join("<br>");
        onImport(htmlContent);
        toast.success(`Imported ${file.name}`);
      } else if (fileName.endsWith(".docx")) {
        // Handle Word documents using mammoth
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        
        if (result.messages.length > 0) {
          console.log("Mammoth conversion messages:", result.messages);
        }
        
        onImport(result.value);
        toast.success(`Imported ${file.name}`);
      } else if (fileName.endsWith(".doc")) {
        toast.error("Legacy .doc files are not supported. Please convert to .docx or .txt");
      } else {
        toast.error("Unsupported file type. Please use .txt or .docx files");
      }
    } catch (error) {
      console.error("Document import error:", error);
      toast.error("Failed to import document");
    } finally {
      setIsLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const triggerFileSelect = (accept: string) => {
    acceptedTypes.current = accept;
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept=".txt,.docx"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || isLoading}
            title="Import Document"
            className="h-7 w-7 p-0"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileUp className="h-3.5 w-3.5" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="space-y-1">
            <button
              onClick={() => triggerFileSelect(".txt")}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left"
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Text File</div>
                <div className="text-xs text-muted-foreground">.txt</div>
              </div>
            </button>
            <button
              onClick={() => triggerFileSelect(".docx")}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left"
            >
              <FileText className="h-4 w-4 text-blue-500" />
              <div>
                <div className="font-medium">Word Document</div>
                <div className="text-xs text-muted-foreground">.docx</div>
              </div>
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
};
