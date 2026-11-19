import { Search } from "lucide-react";

function SearchBox({
  value,
  setValue,
  placeholder,
}: {
  value: string;
  setValue: (s: string) => void;
  placeholder: string;
}) {
  return (
    <div className="search">
      <Search size={17} />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export default SearchBox;
