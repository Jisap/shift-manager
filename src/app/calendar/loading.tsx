import { CalendarSkeleton } from "@/features/calendar/CalendarSkeleton";

export default function CalendarLoading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6">
      <CalendarSkeleton />
    </div>
  );
}
