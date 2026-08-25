// Browser file-save for rendered audio (sample export, song mixdown).
//
// Two details that a naive createElement/click/revoke gets wrong, and that both call sites used to
// get wrong identically:
//   - the anchor has to be in the document; Firefox ignores clicks on detached anchors
//   - the object URL must outlive the click; revoking on the same synchronous line can abort a
//     large download before the browser has finished reading the blob
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
