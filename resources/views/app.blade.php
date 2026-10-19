<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title inertia>Vama Invoice</title>

        {{-- 1. Embedded Data URI: Loads instantly with ZERO network requests, cannot 404 --}}
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSI+ICA8ZGVmcz4gICAgPGxpbmVhckdyYWRpZW50IGlkPSJ2YW1hLWJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4gICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMzEyZTgxIi8+ICAgICAgPHN0b3Agb2Zmc2V0PSI0MCUiIHN0b3AtY29sb3I9IiM0MzM4Y2EiLz4gICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM2MzY2ZjEiLz4gICAgPC9saW5lYXJHcmFkaWVudD4gICAgPGxpbmVhckdyYWRpZW50IGlkPSJ2YW1hLXYiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmZmZmZmYiLz4gICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNjN2QyZmUiLz4gICAgPC9saW5lYXJHcmFkaWVudD4gICAgPGxpbmVhckdyYWRpZW50IGlkPSJ2YW1hLWFjY2VudCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+ICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzM4YmRmOCIvPiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzgxOGNmOCIvPiAgICA8L2xpbmVhckdyYWRpZW50PiAgPC9kZWZzPiAgICA8IS0tIEJhc2UgU3F1aXJjbGUgLS0+ICA8cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHJ4PSIxNiIgZmlsbD0idXJsKCN2YW1hLWJnKSIvPiAgPHJlY3QgeD0iMSIgeT0iMSIgd2lkdGg9IjYyIiBoZWlnaHQ9IjYyIiByeD0iMTUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjIpIiBzdHJva2Utd2lkdGg9IjEuNSIvPiAgPCEtLSBJbnZvaWNlIFNoZWV0IE91dGxpbmUgLS0+ICA8cmVjdCB4PSIxOCIgeT0iMTIiIHdpZHRoPSIyOCIgaGVpZ2h0PSIzOCIgcng9IjQiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wOCkiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjE4KSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4gICAgPCEtLSBJbnZvaWNlIEZvbGQgLyBDb3JuZXIgY3V0IC0tPiAgPHBhdGggZD0iTTM4IDEyIEw0NiAyMCBINDAgQzM4LjkgMjAgMzggMTkuMSAzOCAxOCBWMTIgWiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjIyKSIvPiAgPCEtLSBIb3Jpem9udGFsIGludm9pY2UgbGVkZ2VyIGxpbmVzIC0tPiAgPGxpbmUgeDE9IjIzIiB5MT0iMjEiIHgyPSIzNCIgeTI9IjIxIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4zKSIgc3Ryb2tlLXdpZHRoPSIxLjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPiAgPGxpbmUgeDE9IjIzIiB5MT0iMjYiIHgyPSI0MSIgeTI9IjI2IiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4zKSIgc3Ryb2tlLXdpZHRoPSIxLjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPiAgPCEtLSBCb2xkIE1vZGVybiBWIFNoYXBlIE92ZXJsYWlkIC0tPiAgPHBhdGggZD0iTTE2IDIyIEwzMS4yIDQ2LjUgQzMxLjYgNDcuMSAzMi40IDQ3LjEgMzIuOCA0Ni41IEw0OCAyMiIgc3Ryb2tlPSJ1cmwoI3ZhbWEtdikiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+ICA8cGF0aCBkPSJNMjIgMjUgTDMyIDQxIEw0MiAyNSIgc3Ryb2tlPSJ1cmwoI3ZhbWEtYWNjZW50KSIgc3Ryb2tlLXdpZHRoPSIyLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPiAgPCEtLSBBY2NlbnQgc3BhcmtsZXMgLyBkb3RzIC0tPiAgPGNpcmNsZSBjeD0iMTYiIGN5PSIyMiIgcj0iMyIgZmlsbD0iIzM4YmRmOCIvPiAgPGNpcmNsZSBjeD0iNDgiIGN5PSIyMiIgcj0iMyIgZmlsbD0iI2ZmZmZmZiIvPiAgPGNpcmNsZSBjeD0iMzIiIGN5PSI0NiIgcj0iMi4yIiBmaWxsPSIjMzhiZGY4Ii8+PC9zdmc+">

        {{-- 2. Direct Root-relative Favicons (Never breaks even if APP_URL has wrong protocol or localhost) --}}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png?v=5">
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v=5">
        <link rel="shortcut icon" type="image/x-icon" href="/favicon.ico?v=5">
        <link rel="apple-touch-icon" href="/favicon.png?v=5">

        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.jsx'])
        @inertiaHead
    </head>
    <body>
        @inertia
    </body>
</html>
