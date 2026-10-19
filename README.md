# ⚡ ARIA / JARVIS — MVP Triage & Orchestrazione Processi (Fase 5 ITS 4.0)

[![Python 3.9+](https://img.shields.io/badge/Python-3.9%2B-blue.svg)](https://www.python.org/)
[![Streamlit](https://img.shields.io/badge/Framework-Streamlit-FF4B4B.svg)](https://streamlit.io/)
[![SQLite](https://img.shields.io/badge/Database-SQLite-003B57.svg)](https://www.sqlite.org/)
[![ITS 4.0](https://img.shields.io/badge/Project-ITS%204.0-green.svg)]()

> **Progetto sviluppato per l'azienda partner NSE (Nuove Soluzioni Energie)**  
> **Obiettivo**: Razionalizzazione, automazione e triage intelligente delle richieste operative e degli allarmi di cantiere tramite regole deterministiche, Human-in-the-Loop e predisposizione IoT.

---

## 📌 Indice
- [Contesto e Obiettivi](#-contesto-e-obiettivi)
- [Architettura del Progetto](#-architettura-del-progetto)
- [Funzionalità Chiave dell'MVP](#-funzionalità-chiave-dellmvp)
- [Requisiti e Installazione](#-requisiti-e-installazione)
- [Avvio Rapido (1-Click)](#-avvio-rapido-1-click)
- [Struttura del Repository](#-struttura-del-repository)
- [Guida all'Esecuzione dei Test e A/B Testing](#-guida-allesecuzione-dei-test-e-ab-testing)
- [Pianificazione e Sviluppi Futuri (Roadmap)](#-pianificazione-e-sviluppi-futuri-roadmap)
- [Team di Progetto](#-team-di-progetto)

---

## 🌐 Contesto e Obiettivi

Nello scenario operativo dell'azienda **NSE**, le comunicazioni in ingresso (richieste d'intervento tecnico, allarmi dagli impianti, fatturazione, richieste commerciali) pervengono in modo frammentato e destrutturato[cite: 1, 18]. 

**ARIA/JARVIS** nasce per trasformare questo flusso caotico in un quadro operativo ordinato, tracciabile ed efficiente[cite: 1, 18]:
* **Ingresso ed Estrazione**: Lettura della richiesta e normalizzazione in formato dati unico[cite: 1].
* **Triage Deterministico**: Identificazione immediata di Categoria, Priorità e Ruolo Responsabile tramite regole ed estrazione di keyword aziendali.
* **Human-in-the-Loop (HITL)**: Validazione ed approvazione preventiva obbligatoria da parte dell'Amministratore prima dell'assegnazione finale al tecnico o al reparto.
* **Predisposizione IoT (MQTT)**: Predisposizione all'intercettazione diretta di allarmi di cantiere per la manutenzione predittiva[cite: 3].

---

## 🏗 Architettura del Progetto

Il sistema segue un'architettura modulare e disaccoppiata:
