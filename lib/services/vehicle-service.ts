"use client";
import {
  getCustomerRecords,
  writeCustomerRecord,
  watchRows,
  uploadCustomerFile,
} from "@/lib/customer-data";
import type { Vehicle, VehicleInput } from "@/lib/types/vehicle";
export const getVehicles = (id: string) =>
  getCustomerRecords<Vehicle>(id, "vehicles");
export const getVehicleById = async (id: string, vehicleId: string) =>
  (await getVehicles(id)).find((vehicle) => vehicle.id === vehicleId) || null;
export const watchVehicles = (
  id: string,
  callback: (rows: Vehicle[]) => void,
) => watchRows("customer_records", id, () => getVehicles(id), callback);
export const addVehicle = (id: string, input: VehicleInput) =>
  writeCustomerRecord(id, "vehicles", input);
export const updateVehicle = (
  id: string,
  vehicleId: string,
  patch: Partial<VehicleInput>,
) => writeCustomerRecord(id, "vehicles", patch, vehicleId);
export const deleteVehicle = (id: string, vehicleId: string) =>
  writeCustomerRecord(id, "vehicles", {}, vehicleId, true);
export const uploadVehiclePhoto = (
  id: string,
  _vehicleId: string,
  file: File,
  _type: "vehicle" | "damage",
) => {
  void _vehicleId;
  void _type;
  return uploadCustomerFile(id, file);
};
