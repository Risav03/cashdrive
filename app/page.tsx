import { Card } from './components/auth/cards/card';

export default async function Home() {

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Welcome to Our App
          </h1>
          
          <Card/>
        </div>
      </div>
    </div>
  );
}
