import React from 'react';
import { User, Phone, MapPin, Calendar, Briefcase } from 'lucide-react';

interface PatientHeaderProps {
  patient: {
    firstName: string;
    middleName: string;
    lastName: string;
    age: number;
    sex: string;
    dob: string;
    address: string;
    contactNumber: string;
    department: string;
    status: 'Student' | 'Personnel';
  };
}

const PatientHeader: React.FC<PatientHeaderProps> = ({ patient }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
            <User size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {patient.lastName}, {patient.firstName}
            </h1>
            <div className="flex flex-wrap gap-3 mt-2">
              <span className="flex items-center gap-1 text-slate-500 text-sm">
                <Calendar size={14} /> {patient.age} years old • {patient.sex} • {patient.dob}
              </span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-8">
          <div className="flex items-center gap-2 text-slate-600">
            <Phone size={16} className="text-slate-400" />
            <span className="text-sm font-medium">{patient.contactNumber}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Briefcase size={16} className="text-slate-400" />
            <span className="text-sm font-medium">{patient.department}</span>
          </div>
          <div className="flex items-start gap-2 text-slate-600 sm:col-span-2">
            <MapPin size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <span className="text-sm font-medium leading-tight">{patient.address}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientHeader;
