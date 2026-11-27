import { useState } from "react";
import { BookOpen, Film } from "lucide-react";

export default function CoverImage({
  src,
  alt = "Capa da obra",
  clubType = "book",
  className = "w-14 h-20 sm:w-16 sm:h-24",
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const Icon = clubType === "movie" ? Film : BookOpen;
  const showImage = Boolean(src) && !failed;

  return (
    <div
      className={`relative rounded-md border border-gray-200 bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center ${className}`}
    >
      {(!showImage || !loaded) && (
        <div
          className={`absolute inset-0 flex items-center justify-center text-gray-400 ${
            showImage ? "animate-pulse bg-gray-200/80" : "bg-gray-100"
          }`}
        >
          <Icon size={18} strokeWidth={1.75} />
        </div>
      )}

      {showImage && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setFailed(true);
            setLoaded(false);
          }}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
}
