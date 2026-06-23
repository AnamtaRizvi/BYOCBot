import type { ModulePickerOption } from "@/types";

interface ModulePickerProps {
  options: ModulePickerOption[];
  onSelect: (moduleId: number, name: string) => void;
}

function optionKey(opt: ModulePickerOption, index: number): string {
  return opt.pickerKey ?? `${opt.moduleId}-${index}-${opt.name}`;
}

export function ModulePicker({ options, onSelect }: ModulePickerProps) {
  return (
    <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      {options.map((opt, index) => (
        <button
          key={optionKey(opt, index)}
          type="button"
          onClick={() => onSelect(opt.moduleId, opt.name)}
          className="rounded-md border border-transparent bg-white px-3 py-2 text-left text-sm transition hover:border-[#CC0033] hover:bg-red-50"
        >
          <span className="font-medium text-[#CC0033]">#{opt.moduleId}</span>{" "}
          {opt.name}
        </button>
      ))}
    </div>
  );
}
