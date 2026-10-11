<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Talha Inventory</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  </head>
  <style>
   
    body, html {
        height: 100%;
    }
    body {
        display: flex;
        flex-direction: column;
    }
    main {
        flex: 1;
    }
    .card {
            cursor: pointer;
            padding: 10px; /* Default padding */
        }
        .card-text {
            font-size: 1.2rem;
            font-weight: bold;
            text-align: center; /* Center text horizontally */
            margin: 0; /* Remove any default margin */
        }
        @media (max-width: 576px) {
            #back, #bac{
                font-size:20px;
                padding: 5px !important; 
                text-align:center;/* Remove padding for mobile screens */
            }
        }
        .btn-custom {
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
        }
        .table td, .table th {
            white-space: nowrap; /* Prevent table data from wrapping */
        }
          @media (max-width: 576px) {
            .hstack {
              margin:0 40px 0 40px;
            }
            
        }
</style>
 
  <body class="bg-dark">
  
  <nav class="navbar navbar-expand-lg bg-body-tertiary ">
  <div class="container-fluid">
    <a class="navbar-brand" href="/">Inventory Software</a>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavAltMarkup" aria-controls="navbarNavAltMarkup" aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse justify-content-end" id="navbarNavAltMarkup">
      <div class="navbar-nav">
        <a class="nav-link" aria-current="page" href="/">Home</a>
        <a class="nav-link" href="/billing">Bills</a>
        <!-- <a class="nav-link" href="#">Login</a> -->
      </div>
    </div>
  </div>
</nav>
