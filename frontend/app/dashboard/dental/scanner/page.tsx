import { Suspense } from 'react';

import ScannerPage from '@/app/dashboard/staff/scanner/page';

function ScannerRouteFallback() {
	return <div className="p-6 text-sm text-gray-500">Loading scanner...</div>;
}

export default function DentalScannerPage() {
	return (
		<Suspense fallback={<ScannerRouteFallback />}>
			<ScannerPage />
		</Suspense>
	);
}
