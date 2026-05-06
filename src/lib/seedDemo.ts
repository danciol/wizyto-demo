import { collection, getDocs, writeBatch, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { addMonths, startOfMonth, addDays, setHours } from 'date-fns';

const SERVICES = [
  { id: 's1', name: 'Manicure klasyczny',   price: 80,  duration: 45,  category: 'manicure', employees: ['e1', 'e2'], active: true, selfBooking: true },
  { id: 's2', name: 'Manicure hybrydowy',   price: 120, duration: 60,  category: 'manicure', employees: ['e1', 'e2'], active: true, selfBooking: true },
  { id: 's3', name: 'Manicure żelowy',      price: 150, duration: 90,  category: 'manicure', employees: ['e1'],       active: true, selfBooking: true },
  { id: 's4', name: 'Pedicure klasyczny',   price: 100, duration: 60,  category: 'pedicure', employees: ['e2'],       active: true, selfBooking: true },
  { id: 's5', name: 'Pedicure hybrydowy',   price: 130, duration: 75,  category: 'pedicure', employees: ['e2'],       active: true, selfBooking: true },
  { id: 's6', name: 'Przedłużanie rzęs',    price: 200, duration: 120, category: 'rzesy',    employees: ['e3'],       active: true, selfBooking: true },
  { id: 's7', name: 'Uzupełnienie rzęs',    price: 130, duration: 90,  category: 'rzesy',    employees: ['e3'],       active: true, selfBooking: true },
  { id: 's8', name: 'Henna brwi',           price: 60,  duration: 30,  category: 'brwi',     employees: ['e1', 'e3'], active: true, selfBooking: true },
  { id: 's9', name: 'Laminowanie brwi',     price: 120, duration: 60,  category: 'brwi',     employees: ['e3'],       active: true, selfBooking: true },
];

const WORKING_HOURS = {
  monday: '9:00-17:00', tuesday: '9:00-17:00', wednesday: '9:00-17:00',
  thursday: '9:00-17:00', friday: '9:00-17:00', saturday: '10:00-15:00', sunday: 'wolne',
};

const EMPLOYEES = [
  { id: 'admin', name: 'Admin Demo',          role: 'admin',     login: 'admin@demo.wizyto.pl', password: 'demo2026', workingHours: WORKING_HOURS, daysOff: [], canViewCalendars: [] },
  { id: 'e1',    name: 'Anna Kowalska',        role: 'pracownik', login: 'anna',                 password: 'demo2026', workingHours: WORKING_HOURS, daysOff: [], canViewCalendars: [] },
  { id: 'e2',    name: 'Karolina Wiśniewska',  role: 'pracownik', login: 'karolina',             password: 'demo2026', workingHours: WORKING_HOURS, daysOff: [], canViewCalendars: [] },
  { id: 'e3',    name: 'Marta Nowak',          role: 'pracownik', login: 'marta',                password: 'demo2026', workingHours: WORKING_HOURS, daysOff: [], canViewCalendars: [] },
];

const CLIENTS = [
  { id: 'c1',  name: 'Zofia Adamczyk',       phone: '+48 600 100 200', email: 'zofia@demo.pl' },
  { id: 'c2',  name: 'Natalia Krawczyk',     phone: '+48 601 200 300', email: 'natalia@demo.pl' },
  { id: 'c3',  name: 'Magdalena Piotrowska', phone: '+48 602 300 400', email: 'magdalena@demo.pl' },
  { id: 'c4',  name: 'Aleksandra Wójcik',    phone: '+48 603 400 500', email: 'aleksandra@demo.pl' },
  { id: 'c5',  name: 'Paulina Kowalczyk',    phone: '+48 604 500 600', email: 'paulina@demo.pl' },
  { id: 'c6',  name: 'Monika Zając',         phone: '+48 605 600 700', email: 'monika@demo.pl' },
  { id: 'c7',  name: 'Sylwia Lewandowska',   phone: '+48 606 700 800', email: 'sylwia@demo.pl' },
  { id: 'c8',  name: 'Justyna Kamińska',     phone: '+48 607 800 900', email: 'justyna@demo.pl' },
  { id: 'c9',  name: 'Agnieszka Dąbrowska',  phone: '+48 608 900 100', email: 'agnieszka@demo.pl' },
  { id: 'c10', name: 'Katarzyna Mazur',       phone: '+48 609 100 200', email: 'katarzyna@demo.pl' },
  { id: 'c11', name: 'Ewelina Jankowska',     phone: '+48 510 200 300', email: 'ewelina@demo.pl' },
  { id: 'c12', name: 'Barbara Wojciechowska', phone: '+48 511 300 400', email: 'barbara@demo.pl' },
  { id: 'c13', name: 'Dorota Kwiatkowska',    phone: '+48 512 400 500', email: 'dorota@demo.pl' },
  { id: 'c14', name: 'Renata Michalska',      phone: '+48 513 500 600', email: 'renata@demo.pl' },
  { id: 'c15', name: 'Iwona Zawadzka',        phone: '+48 514 600 700', email: 'iwona@demo.pl' },
];

// Days of month for 10 appointments spread evenly
const APPOINTMENT_DAYS = [1, 4, 7, 9, 12, 15, 18, 20, 23, 26];
const HOURS = [9, 10, 11, 13, 14, 15, 16, 9, 11, 14];

function getEmployeeServices(empId: string) {
  return SERVICES.filter(s => s.employees.includes(empId));
}

async function commitChunked(appointments: object[]) {
  const CHUNK = 400;
  for (let i = 0; i < appointments.length; i += CHUNK) {
    const batch = writeBatch(db);
    appointments.slice(i, i + CHUNK).forEach(appt => {
      batch.set(doc(collection(db, 'appointments')), appt);
    });
    await batch.commit();
  }
}

export async function seedDemo() {
  const existing = await getDocs(collection(db, 'services'));
  if (existing.size > 0) return;

  // Services, employees, clients
  const b1 = writeBatch(db);
  SERVICES.forEach(({ id, ...data }) => b1.set(doc(db, 'services', id), data));
  EMPLOYEES.forEach(({ id, ...data }) => b1.set(doc(db, 'employees', id), data));
  CLIENTS.forEach(({ id, ...data }) => b1.set(doc(db, 'clients', id), data));
  await b1.commit();

  // Settings
  await setDoc(doc(db, 'settings', 'global'), { depositAmount: 0 }, { merge: true });

  const now = new Date();
  const workerIds = ['e1', 'e2', 'e3'];
  const appointments: object[] = [];

  // 12 months back + 60 months ahead = 72 months total
  for (let monthOffset = -12; monthOffset <= 60; monthOffset++) {
    const monthStart = startOfMonth(addMonths(now, monthOffset));

    for (const empId of workerIds) {
      const empServices = getEmployeeServices(empId);

      for (let i = 0; i < 10; i++) {
        const day = addDays(monthStart, APPOINTMENT_DAYS[i]);
        if (day.getDay() === 0) continue; // skip Sundays

        const apptDate = setHours(day, HOURS[i]);
        const isPast = apptDate < now;
        const service = empServices[i % empServices.length];
        const client = CLIENTS[(i + workerIds.indexOf(empId) * 3) % CLIENTS.length];

        appointments.push({
          serviceId: service.id,
          employeeId: empId,
          clientName: client.name,
          clientPhone: client.phone,
          clientEmail: client.email,
          date: apptDate.toISOString(),
          duration: service.duration,
          status: isPast ? 'completed' : 'confirmed',
          createdAt: new Date(apptDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    }
  }

  await commitChunked(appointments);
}
