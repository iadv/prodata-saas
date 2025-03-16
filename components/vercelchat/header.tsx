import { Moon, Sun } from "lucide-react";
import { DeployButton } from "./deploy-button";
import { Button } from "./ui/button";
import { useTheme } from "next-themes";

export const Header = ({ handleClear }: { handleClear: () => void }) => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center justify-between mb-6">
      <h1
        className="text-2xl sm:text-3xl font-bold text-foreground flex items-center cursor-pointer"
        onClick={() => handleClear()}
      >
        Ask questions on your data
      </h1>
      <div className="flex items-center justify-center space-x-2">

      </div>
    </div>
  );
};
