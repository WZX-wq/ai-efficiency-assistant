import AiTextProcessor from '../components/AiTextProcessor';

export default function Workspace() {
  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">AI 工作台</h1>
          <p className="mt-1 text-sm text-gray-500">
            输入文本，选择处理方式，AI 即刻为你完成
          </p>
        </div>

        {/* Main Processor */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: 'calc(100vh - 180px)', minHeight: '500px' }}>
          <AiTextProcessor />
        </div>
      </div>
    </div>
  );
}
