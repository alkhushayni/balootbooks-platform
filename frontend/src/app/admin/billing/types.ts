export type SeatLedgerEntry = {
  institutionId: string;
  institutionName: string;
  maxSeats: number | null;
  consumedSeats: number;
  availableSeats: number | null;
};
