export interface Service {
  id: string;
  name: string;
  category?: string;
  price: number;
  duration: number;
  description?: string;
  employeeIds?: string[];
  employees?: string[];
  active?: boolean;
  selfBooking?: boolean;
  depositAmount?: number; // zaliczka w zł (0 = brak zaliczki)
}

export interface Employee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  photo?: string;
  services?: string[];
  role?: string;
  login?: string;
  password?: string;
  canViewCalendars?: string[];
  workingHours: Record<string, { start: string; end: string } | string>;
  daysOff: string[];
}

export interface Appointment {
  id: string;
  serviceId: string;
  employeeId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  date: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  googleCalendarEventId?: string;
  notes?: string;
  createdAt: string;
  depositAmount?: number;         // wymagana zaliczka w zł
  depositStatus?: 'none' | 'pending' | 'paid' | 'refunded';
  depositOrderId?: string;        // ID zamówienia P24 (sandbox lub live)
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  appointmentIds: string[];
}

export const categories = [
  { id: 'manicure', name: 'Manicure', icon: '💅' },
  { id: 'pedicure', name: 'Pedicure', icon: '🦶' },
  { id: 'brwi', name: 'Brwi', icon: '✨' },
  { id: 'rzesy', name: 'Rzęsy', icon: '👁️' },
  { id: 'makijaz', name: 'Makijaż', icon: '💄' },
  { id: 'pielegnacja', name: 'Pielęgnacja', icon: '🌸' },
];

export const mockServices: Service[] = [
  { id: '1', name: 'Manicure klasyczny', category: 'manicure', price: 80, duration: 45, description: 'Klasyczny manicure z malowaniem paznokci', employeeIds: ['1', '2'], active: true },
  { id: '2', name: 'Manicure hybrydowy', category: 'manicure', price: 120, duration: 60, description: 'Trwały manicure hybrydowy z szeroką paletą kolorów', employeeIds: ['1', '2'], active: true },
  { id: '3', name: 'Manicure żelowy', category: 'manicure', price: 150, duration: 90, description: 'Przedłużanie i modelowanie paznokci żelem', employeeIds: ['1'], active: true },
  { id: '4', name: 'Zdobienie paznokci', category: 'manicure', price: 30, duration: 30, description: 'Artystyczne zdobienie paznokci', employeeIds: ['1', '2'], active: true },
  { id: '5', name: 'Pedicure klasyczny', category: 'pedicure', price: 100, duration: 60, description: 'Pedicure z pielęgnacją stóp', employeeIds: ['2'], active: true },
  { id: '6', name: 'Pedicure hybrydowy', category: 'pedicure', price: 140, duration: 75, description: 'Pedicure z malowaniem hybrydowym', employeeIds: ['2'], active: true },
  { id: '7', name: 'Regulacja brwi', category: 'brwi', price: 40, duration: 20, description: 'Profesjonalna regulacja kształtu brwi', employeeIds: ['1', '3'], active: true },
  { id: '8', name: 'Henna brwi', category: 'brwi', price: 60, duration: 30, description: 'Koloryzacja brwi henną', employeeIds: ['1', '3'], active: true },
  { id: '9', name: 'Laminacja brwi', category: 'brwi', price: 150, duration: 45, description: 'Laminacja brwi z efektem liftingu', employeeIds: ['3'], active: true },
  { id: '10', name: 'Przedłużanie rzęs 1:1', category: 'rzesy', price: 200, duration: 120, description: 'Klasyczne przedłużanie rzęs metodą 1:1', employeeIds: ['3'], active: true },
  { id: '11', name: 'Rzęsy objętościowe 2-3D', category: 'rzesy', price: 280, duration: 150, description: 'Przedłużanie rzęs metodą objętościową', employeeIds: ['3'], active: true },
  { id: '12', name: 'Uzupełnienie rzęs', category: 'rzesy', price: 130, duration: 60, description: 'Uzupełnienie przedłużonych rzęs', employeeIds: ['3'], active: true },
  { id: '13', name: 'Makijaż dzienny', category: 'makijaz', price: 150, duration: 60, description: 'Delikatny makijaż na co dzień', employeeIds: ['1'], active: true },
  { id: '14', name: 'Makijaż wieczorowy', category: 'makijaz', price: 200, duration: 75, description: 'Elegancki makijaż wieczorowy', employeeIds: ['1'], active: true },
  { id: '15', name: 'Zabieg na twarz', category: 'pielegnacja', price: 180, duration: 60, description: 'Oczyszczanie i nawilżanie skóry twarzy', employeeIds: ['2', '3'], active: true },
];

export const mockEmployees: Employee[] = [
  {
    id: '1', name: 'Anna Kowalska', photo: '',
    services: ['1', '2', '3', '4', '7', '8', '13', '14'],
    workingHours: {
      mon: { start: '09:00', end: '17:00' },
      tue: { start: '09:00', end: '17:00' },
      wed: { start: '09:00', end: '17:00' },
      thu: { start: '09:00', end: '17:00' },
      fri: { start: '09:00', end: '17:00' },
    },
    daysOff: [],
  },
  {
    id: '2', name: 'Marta Nowak', photo: '',
    services: ['1', '2', '4', '5', '6', '15'],
    workingHours: {
      mon: { start: '10:00', end: '18:00' },
      tue: { start: '10:00', end: '18:00' },
      wed: { start: '10:00', end: '18:00' },
      thu: { start: '10:00', end: '18:00' },
      fri: { start: '10:00', end: '16:00' },
      sat: { start: '09:00', end: '14:00' },
    },
    daysOff: [],
  },
  {
    id: '3', name: 'Karolina Wiśniewska', photo: '',
    services: ['7', '8', '9', '10', '11', '12', '15'],
    workingHours: {
      mon: { start: '09:00', end: '17:00' },
      tue: { start: '09:00', end: '17:00' },
      wed: { start: '11:00', end: '19:00' },
      thu: { start: '09:00', end: '17:00' },
      fri: { start: '09:00', end: '17:00' },
      sat: { start: '09:00', end: '14:00' },
    },
    daysOff: [],
  },
];

export const mockAppointments: Appointment[] = [
  {
    id: '1', serviceId: '2', employeeId: '1', clientName: 'Joanna Zielińska',
    clientPhone: '+48 600 100 200', clientEmail: 'joanna@email.com',
    date: new Date().toISOString(), duration: 60, status: 'confirmed',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2', serviceId: '10', employeeId: '3', clientName: 'Katarzyna Dąbrowska',
    clientPhone: '+48 600 300 400', clientEmail: 'kasia@email.com',
    date: new Date(Date.now() + 2 * 3600000).toISOString(), duration: 120, status: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3', serviceId: '5', employeeId: '2', clientName: 'Magdalena Lewandowska',
    clientPhone: '+48 600 500 600', clientEmail: 'magda@email.com',
    date: new Date(Date.now() + 86400000).toISOString(), duration: 60, status: 'confirmed',
    createdAt: new Date().toISOString(),
  },
];
