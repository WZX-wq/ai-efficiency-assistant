export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            服务条款
          </h1>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            最后更新日期：2025 年 1 月
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-gray dark:prose-invert max-w-none prose-headings:scroll-mt-24 prose-a:text-primary-600 dark:prose-a:text-primary-400 prose-a:no-underline hover:prose-a:underline">
          <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
            欢迎使用 AI 效率助手（以下简称"本平台"）。请您在使用本平台提供的各项服务前，仔细阅读以下服务条款。使用本平台的服务即表示您同意受本条款的约束。
          </p>

          {/* 服务说明 */}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-10 mb-4">
            一、服务说明
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            AI 效率助手是一个 AI 驱动的内容创作与运营效率工具平台，主要提供以下服务：
          </p>
          <ul className="list-disc pl-6 space-y-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            <li>AI 智能改写、扩写、翻译、总结等文本处理功能。</li>
            <li>短视频脚本创作、直播话术生成等 AI 创作工具。</li>
            <li>数据分析、营销日历等运营辅助功能。</li>
            <li>数字化代运营相关的咨询与对接服务。</li>
          </ul>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-3">
            本平台提供的服务内容将根据业务发展持续更新，具体以平台实际提供的功能为准。我们保留随时新增、修改或中断部分服务的权利。
          </p>

          {/* 用户责任 */}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-10 mb-4">
            二、用户责任
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            您在使用本平台时，应遵守以下规范：
          </p>
          <ul className="list-disc pl-6 space-y-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            <li>注册信息真实、准确、完整，并及时更新。</li>
            <li>妥善保管账户信息和 API Key，对账户下的所有活动承担责任。</li>
            <li>不得利用本平台生成违法、有害、侵权或违反公序良俗的内容。</li>
            <li>不得对本平台进行反向工程、反编译或以其他方式获取源代码。</li>
            <li>不得利用自动化脚本、爬虫等技术手段对本平台进行恶意访问或攻击。</li>
            <li>不得将本平台服务转售、再许可或以任何方式提供给第三方使用。</li>
          </ul>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-3">
            如您违反上述规定，我们有权视情节轻重采取警告、限制功能、暂停服务或永久注销账户等措施。
          </p>

          {/* 知识产权 */}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-10 mb-4">
            三、知识产权
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            关于知识产权，双方明确以下约定：
          </p>
          <ul className="list-disc pl-6 space-y-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            <li><strong className="text-gray-800 dark:text-gray-200">平台权利：</strong>本平台的界面设计、代码、商标、Logo 及其他原创内容均受知识产权法律保护，归我们或相关权利人所有。</li>
            <li><strong className="text-gray-800 dark:text-gray-200">用户内容：</strong>您通过本平台输入和生成的内容，知识产权归您所有。您授予我们仅在提供服务所必需的范围内使用这些内容的许可。</li>
            <li><strong className="text-gray-800 dark:text-gray-200">开源许可：</strong>本平台部分组件基于开源协议发布，相关权利义务遵循对应的开源许可条款。</li>
          </ul>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-3">
            未经我们事先书面许可，您不得以任何形式复制、传播或商业使用本平台的受保护内容。
          </p>

          {/* 免责声明 */}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-10 mb-4">
            四、免责声明
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            您理解并同意以下免责事项：
          </p>
          <ul className="list-disc pl-6 space-y-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            <li><strong className="text-gray-800 dark:text-gray-200">AI 生成内容：</strong>AI 生成的内容仅供参考和辅助使用，我们不对其准确性、完整性或适用性作出保证。您应对使用 AI 生成内容承担最终责任。</li>
            <li><strong className="text-gray-800 dark:text-gray-200">服务可用性：</strong>本平台按"现状"提供服务，不作任何明示或暗示的保证。我们不对服务中断、数据丢失或其他技术问题承担责任（因我们故意或重大过失导致的除外）。</li>
            <li><strong className="text-gray-800 dark:text-gray-200">第三方链接：</strong>本平台可能包含指向第三方网站或服务的链接，我们对第三方内容不承担任何责任。</li>
            <li><strong className="text-gray-800 dark:text-gray-200">用户行为：</strong>您因使用本平台而产生的任何直接或间接损失，在适用法律允许的最大范围内，我们不承担责任。</li>
          </ul>

          {/* 服务变更与终止 */}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-10 mb-4">
            五、服务变更与终止
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            关于服务的变更与终止，适用以下规则：
          </p>
          <ul className="list-disc pl-6 space-y-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            <li>我们保留随时修改、暂停或终止部分或全部服务的权利，并将提前通过站内通知或邮件等方式告知用户。</li>
            <li>如因重大功能调整导致服务无法继续，我们将按剩余服务期限的比例进行退款。</li>
            <li>您可以随时注销账户并停止使用本平台服务。注销后，我们将在 30 日内删除您的个人数据（法律法规另有要求的除外）。</li>
            <li>免费版用户不享有退款权利。付费用户在购买后 7 天内可申请无理由退款。</li>
          </ul>

          {/* 争议解决 */}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-10 mb-4">
            六、争议解决
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            本条款的订立、执行和解释均适用中华人民共和国法律。
          </p>
          <ul className="list-disc pl-6 space-y-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            <li>因本条款或本平台服务引起的任何争议，双方应首先通过友好协商解决。</li>
            <li>协商不成的，任何一方均有权向我们所在地有管辖权的人民法院提起诉讼。</li>
            <li>在争议解决期间，双方应继续履行本条款中不涉争议的其他部分。</li>
          </ul>

          {/* 其他条款 */}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-10 mb-4">
            七、其他条款
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            <li><strong className="text-gray-800 dark:text-gray-200">完整协议：</strong>本服务条款与隐私政策共同构成您与本平台之间的完整协议。</li>
            <li><strong className="text-gray-800 dark:text-gray-200">条款修改：</strong>我们有权修改本条款，修改后的条款将在本页面公布。继续使用本平台即视为您同意修改后的条款。</li>
            <li><strong className="text-gray-800 dark:text-gray-200">可分割性：</strong>如本条款的任何部分被认定为无效或不可执行，其余部分仍然有效。</li>
            <li><strong className="text-gray-800 dark:text-gray-200">权利放弃：</strong>我们未行使或延迟行使本条款项下的任何权利，不构成对该权利的放弃。</li>
            <li><strong className="text-gray-800 dark:text-gray-200">条款转让：</strong>未经我们事先书面同意，您不得将本条款项下的权利义务转让给第三方。</li>
          </ul>

          {/* 联系方式 */}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-10 mb-4">
            八、联系方式
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            如您对本服务条款有任何疑问或需要进一步沟通，请通过以下方式联系我们：
          </p>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            <ul className="space-y-2">
              <li><strong className="text-gray-800 dark:text-gray-200">邮箱：</strong>legal@ai-assistant.com</li>
              <li><strong className="text-gray-800 dark:text-gray-200">工作时间：</strong>周一至周五 9:00 - 18:00（法定节假日除外）</li>
              <li><strong className="text-gray-800 dark:text-gray-200">响应时间：</strong>我们将在 15 个工作日内回复您的请求</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
