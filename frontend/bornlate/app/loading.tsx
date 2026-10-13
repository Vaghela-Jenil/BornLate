import Loader from "@/components/ui/loader";

export default function Loading() {
  return (
    <div className="flex min-h-svh min-w-0 flex-1 items-center justify-center bg-background">
      <Loader/>
    </div>
  );
}
