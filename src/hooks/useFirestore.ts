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

  const normalizeEmployee = <T extends Partial<Employee>>(e: T): T => ({
    ...e,
    ...(e.email !== undefined && { email: e.email.toLowerCase().trim() }),
    ...(e.login !== undefined && { login: e.login.toLowerCase().trim() }),
  });

  const addEmployee = async (employee: Omit<Employee, 'id'>) => {
    await addDoc(collection(db, 'employees'), normalizeEmployee(employee));
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    const { id: _, ...data } = updates as Employee;
    await updateDoc(doc(db, 'employees', id), normalizeEmployee(data));
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
    const ref = await addDoc(collection(db, 'appointments'), {
      ...appointment,
      updatedAt: appointment.updatedAt ?? appointment.createdAt,
    });
    return ref.id;
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    const { id: _, ...data } = updates as Appointment;
    await updateDoc(doc(db, 'appointments', id), { ...data, updatedAt: new Date().toISOString() });
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

// --- Settings ---
export function useSettings() {
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [textBeeApiKey, setTextBeeApiKey] = useState<string>('');
  const [textBeeDeviceId, setTextBeeDeviceId] = useState<string>('');
  const [reminderTemplate, setReminderTemplate] = useState<string>('');
  const [cloudinaryCloudName, setCloudinaryCloudName] = useState<string>('');
  const [cloudinaryUploadPreset, setCloudinaryUploadPreset] = useState<string>('');
  const [googleReviewsUrl, setGoogleReviewsUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setDepositAmount(d.depositAmount ?? 0);
        setTextBeeApiKey(d.textBeeApiKey ?? '');
        setTextBeeDeviceId(d.textBeeDeviceId ?? '');
        setReminderTemplate(d.reminderTemplate ?? '');
        setCloudinaryCloudName(d.cloudinaryCloudName ?? '');
        setCloudinaryUploadPreset(d.cloudinaryUploadPreset ?? '');
        setGoogleReviewsUrl(d.googleReviewsUrl ?? '');
      } else {
        setDepositAmount(0);
        setTextBeeApiKey('');
        setTextBeeDeviceId('');
        setReminderTemplate('');
        setCloudinaryCloudName('');
        setCloudinaryUploadPreset('');
        setGoogleReviewsUrl('');
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

  const saveGoogleReviews = async (url: string) => {
    await import('firebase/firestore').then(({ setDoc }) =>
      setDoc(doc(db, 'settings', 'global'), { googleReviewsUrl: url }, { merge: true })
    );
  };

  return { depositAmount, textBeeApiKey, textBeeDeviceId, reminderTemplate, cloudinaryCloudName, cloudinaryUploadPreset, googleReviewsUrl, loading, saveDepositAmount, saveTextBee, saveReminderTemplate, saveCloudinary, saveGoogleReviews };
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

// --- Waiting List ---
export interface WaitingListEntry {
  id: string;
  serviceId: string;
  serviceName: string;
  employeeId: string;
  employeeName: string;
  preferredDate: string;
  clientName: string;
  clientPhone: string;
  createdAt: string;
  notified: boolean;
}

export function useWaitingList() {
  const { data, loading } = useCollection<WaitingListEntry>('waiting_list', orderBy('createdAt', 'desc'));

  const addToWaitingList = async (entry: Omit<WaitingListEntry, 'id'>) => {
    await addDoc(collection(db, 'waiting_list'), entry);
  };

  const removeFromWaitingList = async (id: string) => {
    await deleteDoc(doc(db, 'waiting_list', id));
  };

  const markNotified = async (id: string) => {
    await updateDoc(doc(db, 'waiting_list', id), { notified: true });
  };

  return { waitingList: data, loading, addToWaitingList, removeFromWaitingList, markNotified };
}
