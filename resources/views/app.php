<?php
// resources/views/app.php
// Main layout view — assembles all partials and modals
?>
<!doctype html>
<html lang="en">
<?php include __DIR__ . '/partials/head.html'; ?>
<body>

<?php include __DIR__ . '/partials/login.html'; ?>

<div id="main-app" class="hidden flex h-screen overflow-hidden bg-slate-50">
  <?php include __DIR__ . '/partials/sidebar.html'; ?>

  <div class="flex-1 flex flex-col overflow-hidden">
    <?php include __DIR__ . '/partials/navbar.html'; ?>
    <?php include __DIR__ . '/partials/body.html'; ?>
  </div>
</div>

<!-- ═══ MODALS ══════════════════════════════════════════════════ -->
<?php include __DIR__ . '/modals/status-requests-modal.html'; ?>
<?php include __DIR__ . '/modals/request-detail-modal.html'; ?>
<?php include __DIR__ . '/modals/new-request-modal.html'; ?>
<?php include __DIR__ . '/modals/user-modal.html'; ?>
<?php include __DIR__ . '/modals/deactivate-modal.html'; ?>

<?php include __DIR__ . '/partials/footer.html'; ?>
