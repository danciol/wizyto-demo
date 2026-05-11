import { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Service, Employee, Appointment, Client } from '@/data/services';

// Generic hook for real-time Firestore collection
function useCollection<T extends { id: string }>(
  collectionName: string,
  ...constraints: QueryConstraint[]
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, collectionName), ...constraints);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      })) as T[];
      setData(items);
      setLoading(false);
    }, (error) => {
      console.error(`Firestore error (${collectionName}):`, error);
      setLoading(false);
    });
    return unsubscribe;
  }, [collectionName]);

  return { data, loading };
}

// --- Services ---
export function useServices() {
  const { data, loading } = useCollection<Service>('services');
  
  const addService = async (service: Omit<Service, 'id'>) => {
    await addDoc(collection(db, 'services'), service);
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    const { id: _, ...data } = updates as Service;
    await updateDoc(doc(db, 'services', id), data);
  };

  const deleteService = async (id: string) => {
    await deleteDoc(doc(db, 'services', id));
  };

  return { services: data, loading, addService, updateService, deleteService };
}

// --- Employees ---
export function useEmployees() {
  const { data, loading } = useCollection<Employee>('employees');

  const addEmployee = async (employee: Omit<Employee, 'id'>) => {
    await addDoc(collection(db, 'employees'), employee);
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    const { id: _, ...data } = updates as Employee;
    await updateDoc(doc(db, 'employees', id), data);
  };

  const deleteEmployee = async (id: string) => {
    await deleteDoc(doc(db, 'employees', id));
  };

  return { employees: data, loading, addEmployee, updateEmployee, deleteEmployee };
}

// --- Appointments ---
export function useAppointments() {
  const { data, loading } = useCollection<Appointment>('appointments');

  const addAppointment = async (appointment: Omit<Appointment, 'id'>): Promise<string> => {
    const ref = await addDoc(collection(db, 'appointments'), appointment);
    return ref.id;
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    const { id: _, ...data } = updates as Appointment;
    await updateDoc(doc(db, 'appointments', id), data);
  };

  const deleteAppointment = async (id: string) => {
    await deleteDoc(doc(db, 'appointments', id));
  };

  return { appointments: data, loading, addAppointment, updateAppointment, deleteAppointment };
}

// --- Clients ---
export function useClients() {
  const { data, loading } = useCollection<Client>('clients');

  const addClient = async (client: Omit<Client, 'id'>) => {
    await addDoc(collection(db, 'clients'), client);
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const { id: _, ...rest } = updates as Client;
    await updateDoc(doc(db, 'clients', id), rest);
  };

  return { clients: data, loading, addClient, updateClient };
}

// --- Time Blocks ---
export interface TimeBlock {
  id: string;
  employeeId: string;
  date: string;      // yyyy-MM-dd
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  note?: string;
}

export function useTimeBlocks() {
  const { data, loading } = useCollection<TimeBlock>('time_blocks', orderBy('date', 'asc'));

  const addTimeBlock = async (block: Omit<TimeBlock, 'id'>) => {
    await addDoc(collection(db, 'time_blocks'), block);
  };

  const deleteTimeBlock = async (id: string) => {
    await deleteDoc(doc(db, 'time_blocks', id));
  };

  return { timeBlocks: data, loading, addTimeBlock, deleteTimeBlock };
}

// --- Settings ---
export function useSettings() {
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [textBeeApiKey, setTextBeeApiKey] = useState<string>('');
  const [textBeeDeviceId, setTextBeeDeviceId] = useState<string>('');
  const [reminderTemplate, setReminderTemplate] = useState<string>('');
  const [cloudinaryCloudName, setCloudinaryCloudName] = useState<string>('');
  const [cloudinaryUploadPreset, setCloudinaryUploadPreset] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        setDepositAmount(snap.data().depositAmount ?? 0);
        setTextBeeApiKey(snap.data().textBeeApiKey ?? '');
        setTextBeeDeviceId(snap.data().textBeeDeviceId ?? '');
        setReminderTemplate(snap.data().reminderTemplate ?? '');
        setCloudinaryCloudName(snap.data().cloudinaryCloudName ?? '');
        setCloudinaryUploadPreset(snap.data().cloudinaryUploadPreset ?? '');
      } else {
        setDepositAmount(0);
        setTextBeeApiKey('');
        setTextBeeDeviceId('');
        setReminderTemplate('');
        setCloudinaryCloudName('');
        setCloudinaryUploadPreset('');
      }
      setLoading(false);
    }, () => setLoading(false));
    return unsubscribe;
  }, []);

  const saveDepositAmount = async (amount: number) => {
    await import('firebase/firestore').then(({ setDoc }) =>
      setDoc(doc(db, 'settings', 'global'), { depositAmount: amount }, { merge: true })
    );
  };

  const saveTextBee = async (apiKey: string, deviceId: string) => {
    await import('firebase/firestore').then(({ setDoc }) =>
      setDoc(doc(db, 'settings', 'global'), { textBeeApiKey: apiKey, textBeeDeviceId: deviceId }, { merge: true })
    );
  };

  const saveReminderTemplate = async (template: string) => {
    await import('firebase/firestore').then(({ setDoc }) =>
      setDoc(doc(db, 'settings', 'global'), { reminderTemplate: template }, { merge: true })
    );
  };

  const saveCloudinary = async (cloudName: string, uploadPreset: string) => {
    await import('firebase/firestore').then(({ setDoc }) =>
      setDoc(doc(db, 'settings', 'global'), { cloudinaryCloudName: cloudName, cloudinaryUploadPreset: uploadPreset }, { merge: true })
    );
  };

  return { depositAmount, textBeeApiKey, textBeeDeviceId, reminderTemplate, cloudinaryCloudName, cloudinaryUploadPreset, loading, saveDepositAmount, saveTextBee, saveReminderTemplate, saveCloudinary };
}
