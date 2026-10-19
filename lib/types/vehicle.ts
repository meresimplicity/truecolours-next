export type Vehicle = {
  id: string;
  userId: string;
  manufacturer: string;
  model: string;
  year: number;
  bodyType: string;
  vin?: string;
  registrationNumber?: string;
  originalPaintColour: string;
  paintCode: string;
  colourName: string;
  panelBeingRepaired?: string;
  insuranceClaim: boolean;
  vehiclePhotos: string[];
  damagePhotos: string[];
  repairNotes?: string;
  preferredFinish?: string;
  preferredPaintSystem?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type VehicleInput = Omit<Vehicle, "id" | "userId" | "createdAt" | "updatedAt">;

export const bodyTypes = [
  "Sedan",
  "Hatchback",
  "SUV",
  "Bakkie / Pickup",
  "Panel Van",
  "Coupe",
  "Convertible",
  "Station Wagon",
  "Minibus / Taxi",
  "Truck / Commercial",
  "Motorcycle",
  "Other",
] as const;

export const paintFinishes = [
  "Solid",
  "Metallic",
  "Pearl / Mica",
  "Matte",
  "Candy / Custom",
] as const;

export const paintSystems = [
  "2K (Two-Pack)",
  "Basecoat / Clearcoat",
  "Single Stage",
  "Waterborne",
  "Cellulose",
] as const;
