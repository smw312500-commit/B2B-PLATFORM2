import React from 'react';

export default function OtherTab() {
  return (
    <div className="p-6 max-w-xl">
      <h2 className="text-lg font-bold text-gray-700 mb-4">기본 설정</h2>
      <div className="bg-white rounded-lg shadow p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">이동시간 기준 (인천항, 일)</label>
          <input
            type="number"
            defaultValue={1}
            className="border rounded px-3 py-1.5 text-sm w-32"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">이동시간 기준 (부산항, 일)</label>
          <input
            type="number"
            defaultValue={1}
            className="border rounded px-3 py-1.5 text-sm w-32"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">여유시간 (일)</label>
          <input
            type="number"
            defaultValue={1}
            className="border rounded px-3 py-1.5 text-sm w-32"
          />
        </div>
        <div className="pt-2 text-xs text-gray-400">
          픽업일 = 납기일 - 이동시간 - 여유시간
        </div>
      </div>
    </div>
  );
}
