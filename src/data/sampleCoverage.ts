export type CoverageRow = {
  service: string;
  shift: string;
  name: string;
  training: "PGY-1" | "PGY-2" | "PGY-3" | "Attending";
  contact: string;
};

export const todaysCoverage: CoverageRow[] = [
  { service: "2N-CCU", shift: "7a-7p", name: "Gandapur", training: "PGY-1", contact: "11279" },
  { service: "4N", shift: "7a-7p", name: "Sallam", training: "PGY-1", contact: "11287" },
  { service: "4N-3W PGY2", shift: "7a-7p", name: "Ali", training: "PGY-2", contact: "11155" },
  { service: "3W", shift: "7a-7p", name: "Muslehuddin", training: "PGY-1", contact: "11285" },
  { service: "Tele", shift: "7a-7p", name: "Al-Gharazi", training: "PGY-1", contact: "11273" },
  { service: "2N-CCU PGY2", shift: "7a-7p", name: "Valle", training: "PGY-2", contact: "11171" },
  { service: "MICU", shift: "7a-7a", name: "Burdynskyi", training: "PGY-1", contact: "11275" },
  { service: "MICU Senior", shift: "8a-8a", name: "Najera", training: "PGY-2", contact: "11165" },
  { service: "4N-3W PGY1 NF", shift: "7p-7a", name: "Kodwo", training: "PGY-1", contact: "11282" },
  { service: "4N-3W PGY2 NF", shift: "7p-7a", name: "Chekalil", training: "PGY-2", contact: "11161" },
  { service: "Chief On Call", shift: "7a-7p", name: "Al-Hashimi", training: "PGY-3", contact: "534" },
  { service: "PGY3 NF", shift: "7p-7a", name: "Rahman", training: "PGY-3", contact: "541" },
  { service: "Observation Attending", shift: "7a-7a", name: "Algohary", training: "Attending", contact: "" },
  { service: "Faculty Attending On Call", shift: "7a-7a", name: "Akbar Khan", training: "Attending", contact: "" },
  { service: "Chief Resident", shift: "8p-7a", name: "Zhao", training: "PGY-3", contact: "547" },
];