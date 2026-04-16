import { createSupabaseServerClient, isUserAdmin, resolveClient } from '@/lib/supabase-server';
import { redirect, notFound } from 'next/navigation';
import { resolveDeliverablePath, readDeliverableFile, listDeliverableFiles, getMimeType } from '@/lib/deliverables';
import { DELIVERABLE_TYPES, DELIVERABLE_LABELS } from '@/lib/types';
import type { DeliverableType, MoodBoardFeedback as MoodBoardFeedbackType } from '@/lib/types';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import MoodBoardViewer from '@/components/portal/MoodBoardViewer';
import DeviceSwitcher from '@/components/portal/DeviceSwitcher';

interface Props {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<{ client?: string; variant?: string }>;
}

function renderMarkdown(mdText: string): string {
  return sanitizeHtml(marked.parse(mdText) as string, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3', 'img']),
    allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ['src', 'alt'] },
  });
}

function embedAssetAsDataUri(slug: string, basePath: string, assetPath: string): string {
  const content = readDeliverableFile(slug, `${basePath}/${assetPath}`);
  if (!content) return assetPath;
  const ext = assetPath.split('.').pop()?.toLowerCase();
  const mime = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'svg' ? 'image/svg+xml' : ext === 'webp' ? 'image/webp' : 'application/octet-stream';
  return `data:${mime};base64,${content.toString('base64')}`;
}

export default async function DeliverablesPage({ params, searchParams }: Props) {
  const pathSegments = (await params).path || [];
  const queryParams = await searchParams;
  const deliverableType = pathSegments[0] as DeliverableType;
  const filePath = pathSegments.slice(1).join('/');

  if (!deliverableType || !DELIVERABLE_TYPES.includes(deliverableType)) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Check admin
  const clientParam = queryParams.client;
  const isAdmin = await isUserAdmin(supabase, user.id);

  // Get client
  const { data: client, error: clientError } = await resolveClient(supabase, user.id, clientParam, isAdmin);
  if (clientError && clientError.code !== 'PGRST116') throw new Error('Ein Fehler ist aufgetreten.');
  if (!client) {
    // Admin viewing deliverables without a selected client → send them to the admin overview
    if (isAdmin && !clientParam) redirect('/portal/dashboard');
    notFound();
  }

  // Verify deliverable published
  const { data: deliverable, error: delError } = await supabase
    .from('deliverables').select('*').eq('client_id', client.id).eq('type', deliverableType).single();
  if (delError && delError.code !== 'PGRST116') throw new Error('Ein Fehler ist aufgetreten.');
  if (!deliverable) notFound();

  // Mark as viewed
  if (!deliverable.viewed_at && !isAdmin) {
    await supabase.from('deliverables')
      .update({ viewed_at: new Date().toISOString(), status: 'viewed' })
      .eq('id', deliverable.id);
  }

  const slug = client.slug;
  const requestedPath = filePath || '';
  const title = DELIVERABLE_LABELS[deliverableType] ?? deliverableType;
  const clientSuffix = isAdmin && clientParam ? `?client=${clientParam}` : '';

  // --- Determine render mode ---

  let renderMode = 'filelist';
  let markdownHtml = '';
  let srcdocHtml = '';
  let pdfPath = '';
  let iframeSrc = '';
  let fileList: { name: string; href: string }[] = [];
  let moodBoardData: {
    variantData: Record<string, string>;
    activeVariant: string;
    variants: string[];
    feedbackData: MoodBoardFeedbackType[];
  } | null = null;

  if (!requestedPath) {
    const metadata = deliverable.metadata as Record<string, unknown>;
    const metadataFiles = Array.isArray(metadata?.files) ? (metadata.files as string[]) : [];
    const files = metadataFiles.length > 0 ? metadataFiles : listDeliverableFiles(slug, deliverableType);

    if (deliverableType === 'brand-guide') {
      const content = readDeliverableFile(slug, 'brand-guide/brand-guide.md');
      if (!content) notFound();
      renderMode = 'markdown';
      markdownHtml = renderMarkdown(content.toString('utf-8'));
    } else if (deliverableType === 'proposal') {
      renderMode = 'pdf';
      pdfPath = `/portal/api/deliverables/proposal/angebot.pdf${clientSuffix}`;
    } else if (deliverableType === 'website-preview') {
      const previewHtml = readDeliverableFile(slug, 'website-preview/index.html');
      if (!previewHtml) notFound();
      let html = previewHtml.toString('utf-8');
      html = html.replace(/src="(assets\/[^"]+)"/g, (_match, assetPath) => {
        return `src="${embedAssetAsDataUri(slug, 'website-preview', assetPath)}"`;
      });
      renderMode = 'srcdoc';
      srcdocHtml = html;
    } else if (deliverableType === 'mood-board') {
      const variants = files.filter(f => f.endsWith('.html')).sort();
      if (variants.length === 0) notFound();

      const variantData: Record<string, string> = {};
      for (const variant of variants) {
        const variantHtml = readDeliverableFile(slug, `mood-board/${variant}`);
        if (!variantHtml) continue;
        let html = variantHtml.toString('utf-8');

        html = html.replace(/src="(assets\/[^"]+)"/g, (_m, p) => `src="${embedAssetAsDataUri(slug, 'mood-board', p)}"`);
        html = html.replace(/background(?:-image)?:\s*url\(['"]?(assets\/[^'")]+)['"]?\)/g, (_m, p) => `background: url('${embedAssetAsDataUri(slug, 'mood-board', p)}')`);

        variantData[variant.replace('.html', '')] = html;
      }

      if (Object.keys(variantData).length === 0) notFound();

      const firstVariantName = variants[0].replace('.html', '');
      const activeVariantName = (queryParams.variant && variantData[queryParams.variant])
        ? queryParams.variant
        : firstVariantName;

      const { data: feedbackData } = await supabase
        .from('mood_board_feedback').select('*')
        .eq('deliverable_id', deliverable.id).eq('client_id', client.id);

      renderMode = 'mood-board';
      moodBoardData = {
        variantData,
        activeVariant: activeVariantName,
        variants: Object.keys(variantData),
        feedbackData: (feedbackData || []) as unknown as MoodBoardFeedbackType[],
      };
    } else if (deliverableType === 'analysis') {
      renderMode = 'filelist';
      fileList = files.map(f => ({
        name: f,
        href: `/portal/deliverables/analysis/${f}${clientSuffix}`,
      }));
    }
  } else {
    // Specific file requested -- determine render mode
    const resolvedPath = resolveDeliverablePath(slug, `${deliverableType}/${requestedPath}`);
    if (!resolvedPath) notFound();

    const mimeType = getMimeType(requestedPath);

    if (mimeType === 'text/html') {
      renderMode = 'iframe';
      iframeSrc = `/portal/api/deliverables/${deliverableType}/${requestedPath}${clientSuffix}`;
    } else if (mimeType === 'application/pdf') {
      renderMode = 'pdf';
      pdfPath = `/portal/api/deliverables/${deliverableType}/${requestedPath}${clientSuffix}`;
    } else if (mimeType === 'text/markdown') {
      const content = readDeliverableFile(slug, `${deliverableType}/${requestedPath}`);
      if (!content) notFound();
      renderMode = 'markdown';
      markdownHtml = renderMarkdown(content.toString('utf-8'));
    } else {
      // Binary file -- redirect to API route
      redirect(`/api/deliverables/${deliverableType}/${requestedPath}${clientSuffix}`);
    }
  }

  // --- Render ---
  return (
    <>
      <div className="mb-4">
        <a href={`/portal/dashboard${clientSuffix}`} className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Zurück zum Dashboard
        </a>
      </div>
      <h1 className="text-xl font-bold mb-6">{title}</h1>

      {renderMode === 'markdown' && (
        <article className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: markdownHtml }} />
      )}

      {renderMode === 'srcdoc' && (
        <DeviceSwitcher srcdocHtml={srcdocHtml} />
      )}

      {renderMode === 'iframe' && (
        <iframe
          src={iframeSrc}
          sandbox="allow-scripts"
          className="w-full border border-border rounded-lg"
          style={{ minHeight: '80vh' }}
        />
      )}

      {renderMode === 'pdf' && (
        <object data={pdfPath} type="application/pdf" className="w-full rounded-lg" style={{ minHeight: '80vh' }}>
          <p>PDF kann nicht angezeigt werden. <a href={pdfPath} className="text-primary underline">Herunterladen</a></p>
        </object>
      )}

      {renderMode === 'mood-board' && moodBoardData && (
        <MoodBoardViewer
          variantData={moodBoardData.variantData}
          activeVariant={moodBoardData.activeVariant}
          deliverableId={deliverable.id}
          variants={moodBoardData.variants}
          isAdmin={isAdmin}
          feedbackData={moodBoardData.feedbackData}
        />
      )}

      {renderMode === 'filelist' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fileList.map((file) => (
            <a key={file.name} href={file.href} className="block bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
              <span className="text-sm font-medium">{file.name}</span>
            </a>
          ))}
          {fileList.length === 0 && (
            <p className="text-muted-foreground text-sm col-span-2">Keine Dateien verf\u00fcgbar.</p>
          )}
        </div>
      )}
    </>
  );
}
