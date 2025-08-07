const Test = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white/20 backdrop-blur-lg rounded-3xl p-8 shadow-2xl max-w-md w-full">
        <h1 className="text-4xl font-bold text-white mb-6 text-center">
          Test Page
        </h1>
        <div className="space-y-4">
          <div className="bg-green-500/20 p-4 rounded-lg">
            <p className="text-white font-semibold">✅ Tailwind CSS Working</p>
            <p className="text-green-100 text-sm">Gradients, backdrop blur, and colors are rendering</p>
          </div>
          <div className="bg-blue-500/20 p-4 rounded-lg">
            <p className="text-white font-semibold">✅ React Components Working</p>
            <p className="text-blue-100 text-sm">This component is rendering properly</p>
          </div>
          <div className="bg-yellow-500/20 p-4 rounded-lg">
            <p className="text-white font-semibold">✅ Vite Server Working</p>
            <p className="text-yellow-100 text-sm">Hot reload and development server active</p>
          </div>
          <button className="w-full bg-white/30 hover:bg-white/40 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105">
            Interactive Test Button
          </button>
        </div>
      </div>
    </div>
  );
};

export default Test;