import streamlit as st
import pandas as pd
import json
from datetime import datetime

from core.db_manager import DatabaseManager
from core.triage_engine import RuleBasedTriageEngine
from core.synthetic_dataset import get_synthetic_dataset
from core.metrics_calculator import MetricsCalculator

# Configurazione Pagina
st.set_page_config(page_title="ARIA/JARVIS MVP — Triage Local Engine", page_icon="⚡", layout="wide")

db = DatabaseManager()

# Sidebar Navigation
st.sidebar.title("⚡ ARIA / JARVIS MVP")
st.sidebar.caption("Sistema Locale di Triage & Test (Fase 5 ITS 4.0)")

page = st.sidebar.radio("Seleziona Modulo:", [
    "1. Dashboard",
    "2. Nuova Richiesta",
    "3. Coda Richieste e Task",
    "4. Revisione Umana (HITL)",
    "5. Dataset & Esecuzione Test",
    "6. Risultati & Metriche",
    "7. Feedback Utente",
    "8. Confronto A/B Test",
    "9. Configurazione Regole"
])

# ---------------------------------------------------------
# PAGINA 1: DASHBOARD
# ---------------------------------------------------------
if page == "1. Dashboard":
    st.title("📊 Dashboard Operativa ARIA/JARVIS")
    st.markdown("Panoramica dello stato delle richieste e delle metriche di sistema.")

    reqs = db.get_all_requests()
    runs = db.get_test_runs()

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Richieste Totali", len(reqs))
    
    pending_reviews = sum(1 for r in reqs if r['needs_review'] == 1)
    col2.metric("Da Revisionare (HITL)", pending_reviews, delta_color="inverse")
    
    completed = sum(1 for r in reqs if r['status'] in ['Completato', 'In Lavorazione'])
    col3.metric("Task In Lavorazione/Completati", completed)
    
    col4.metric("Sessioni di Test Eseguite", len(runs))

    st.markdown("---")
    st.subheader("Ultime Richieste Inserite")
    if reqs:
        df_reqs = pd.DataFrame(reqs)[['id', 'title', 'channel', 'pred_category', 'pred_priority', 'pred_role', 'confidence', 'needs_review', 'status']]
        st.dataframe(df_reqs.head(10), use_container_width=True)
    else:
        st.info("Nessuna richiesta presente nel sistema. Vai al modulo 'Nuova Richiesta' o esegui il 'Dataset & Esecuzione Test'.")

# ---------------------------------------------------------
# PAGINA 2: NUOVA RICHIESTA
# ---------------------------------------------------------
elif page == "2. Nuova Richiesta":
    st.title("📥 Inserimento Nuova Richiesta Operativa")
    
    with st.form("new_request_form"):
        title = st.text_input("Titolo Richiesta *", placeholder="Es. Guasto inverter cantiere nord")
        description = st.text_area("Descrizione Dettagliata *", placeholder="Descrivi il problema o la richiesta...")
        
        col1, col2, col3 = st.columns(3)
        channel = col1.selectbox("Canale Origine", ["Email", "Modulo Web", "Chat", "Telefono"])
        user_cat = col2.selectbox("Categoria Dichiarata (Opzionale)", ["", "Manutenzione Impianti", "Amministrazione", "Commerciale", "Supporto IT & Coordinamento"])
        user_urg = col3.selectbox("Urgenza Dichiarata (Opzionale)", ["", "Bassa", "Media", "Alta", "Critica"])
        
        notes = st.text_input("Note Aggiuntive")
        submitted = st.form_submit_button("Esegui Triage & Salva")

    if submitted:
        if not title or not description:
            st.error("I campi Titolo e Descrizione sono obbligatori!")
        else:
            engine = RuleBasedTriageEngine("config_rules_vA.json")
            res = engine.classify(title, description)
            
            req_data = {
                "title": title,
                "description": description,
                "channel": channel,
                "user_category": user_cat,
                "user_urgency": user_urg,
                "notes": notes,
                "created_at": datetime.now().isoformat(),
                "pred_category": res["pred_category"],
                "pred_priority": res["pred_priority"],
                "pred_role": res["pred_role"],
                "confidence": res["confidence"],
                "needs_review": res["needs_review"],
                "reasoning": res["reasoning"],
                "status": "Da Revisionare" if res["needs_review"] else "Assegnato"
            }
            
            req_id = db.insert_request(req_data)
            st.success(f"Richiesta #{req_id} registrata ed elaborata con successo!")
            
            st.subheader("Risultato Triage Automatico:")
            st.json(res)

# ---------------------------------------------------------
# PAGINA 3: CODA RICHIESTE E TASK
# ---------------------------------------------------------
elif page == "3. Coda Richieste e Task":
    st.title("📋 Coda Gestione Task ed Escalation")
    reqs = db.get_all_requests()
    
    if not reqs:
        st.warning("Nessun task in coda.")
    else:
        df = pd.DataFrame(reqs)
        st.dataframe(df[['id', 'title', 'pred_category', 'final_category', 'pred_priority', 'final_priority', 'final_role', 'needs_review', 'status']], use_container_width=True)

# ---------------------------------------------------------
# PAGINA 4: REVISIONE UMANA (HITL)
# ---------------------------------------------------------
elif page == "4. Revisione Umana (HITL)":
    st.title("👤 Coda di Revisione Umana (Human-in-the-Loop)")
    st.markdown("In questa sezione l'operatore umano valida o corregge le classificazioni incerte.")

    reqs = db.get_all_requests()
    pending = [r for r in reqs if r['needs_review'] == 1]

    if not pending:
        st.success("🎉 Nessuna richiesta in attesa di revisione umana!")
    else:
        st.write(f"**Casi da revisionare: {len(pending)}**")
        selected_id = st.selectbox("Seleziona ID Richiesta da Revisionare:", [r['id'] for r in pending])
        
        req = next(r for r in pending if r['id'] == selected_id)
        
        col_left, col_right = st.columns(2)
        with col_left:
            st.subheader("Dettagli Richiesta Originale")
            st.write(f"**ID:** {req['id']}")
            st.write(f"**Titolo:** {req['title']}")
            st.write(f"**Descrizione:** {req['description']}")
            st.write(f"**Canale:** {req['channel']}")
        
        with col_right:
            st.subheader("Proposta del Sistema")
            st.write(f"**Categoria Suggerita:** {req['pred_category']}")
            st.write(f"**Priorità Suggerita:** {req['pred_priority']}")
            st.write(f"**Ruolo Destinatario:** {req['pred_role']}")
            st.write(f"**Confidenza Calcolata:** {req['confidence']}")
            st.info(f"**Motivazione:** {req['reasoning']}")

        st.markdown("---")
        st.subheader("Decisione Finale Operatore")
        with st.form("review_form"):
            final_cat = st.selectbox("Categoria Corretta", ["Manutenzione Impianti", "Amministrazione", "Commerciale", "Supporto IT & Coordinamento"], index=0)
            final_prio = st.selectbox("Priorità Corretta", ["Bassa", "Media", "Alta", "Critica"], index=1)
            final_role = st.selectbox("Ruolo Responsabile", ["Luca (Tecnico)", "Sara (Back Office)", "Giulia (Front Office)", "Andrea (Coordinatore)"], index=0)
            reason = st.text_input("Motivo della Correzione / Conferma *", placeholder="Es. Confermato suggerimento sistema / Corretto perché riferimento a guasto urgente")
            
            save_review = st.form_submit_button("Salva Decisione Operatore")
            
            if save_review:
                if not reason:
                    st.error("Inserisci la motivazione della correzione/conferma.")
                else:
                    db.update_request_review(req['id'], final_cat, final_prio, final_role, reason)
                    st.success("Decisione salvata! La richiesta è stata aggiornata.")
                    st.rerun()

# ---------------------------------------------------------
# PAGINA 5: DATASET & ESECUZIONE TEST
# ---------------------------------------------------------
elif page == "5. Dataset & Esecuzione Test":
    st.title("🧪 Dataset Sintetico ed Esecuzione Test")
    
    variant = st.radio("Seleziona Variante Regole per il Test:", ["Variante A (config_rules_vA.json)", "Variante B (config_rules_vB.json)"])
    config_file = "config_rules_vA.json" if "Variante A" in variant else "config_rules_vB.json"

    dataset = get_synthetic_dataset()
    st.subheader(f"Dataset di Test Caricato: {len(dataset)} Casi Sintetici")
    
    if st.checkbox("Mostra Dataset di Riferimento"):
        st.dataframe(pd.DataFrame(dataset), use_container_width=True)

    if st.button("🚀 Esegui Test di Triage Automatico su Tutto il Dataset"):
        engine = RuleBasedTriageEngine(config_file)
        results = []
        
        for item in dataset:
            res = engine.classify(item["title"], item["description"])
            results.append({
                "id": item["id"],
                "title": item["title"],
                "target_cat": item["target_cat"],
                "pred_cat": res["pred_category"],
                "target_prio": item["target_prio"],
                "pred_prio": res["pred_priority"],
                "target_role": item["target_role"],
                "pred_role": res["pred_role"],
                "confidence": res["confidence"],
                "needs_review": res["needs_review"],
                "elapsed_ms": res["elapsed_ms"]
            })

        metrics = MetricsCalculator.calculate_run_metrics(results)
        
        db.save_test_run(
            variant="Variante A" if "Variante A" in variant else "Variante B",
            total=metrics["total"],
            acc_cat=metrics["accuracy_cat"],
            acc_prio=metrics["accuracy_prio"],
            acc_role=metrics["accuracy_role"],
            review_rate=metrics["review_rate"],
            avg_time=metrics["avg_time_ms"],
            raw_json=results
        )

        st.success("Test Completato e Salvato nello Storico!")
        st.session_state['last_test_results'] = results
        st.session_state['last_test_metrics'] = metrics

    if 'last_test_results' in st.session_state:
        st.markdown("---")
        st.subheader("Risultati Ultima Esecuzione")
        st.dataframe(pd.DataFrame(st.session_state['last_test_results']), use_container_width=True)

# ---------------------------------------------------------
# PAGINA 6: RISULTATI & METRICHE
# ---------------------------------------------------------
elif page == "6. Risultati & Metriche":
    st.title("📈 Metriche di Performance e Valutazione")
    
    runs = db.get_test_runs()
    if not runs:
        st.warning("Nessun dato di test disponibile. Esegui prima una sessione dal modulo 'Dataset & Esecuzione Test'.")
    else:
        last_run = runs[0]
        st.subheader(f"Ultimo Test: {last_run['run_date']} (Variante: {last_run['variant']})")
        
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Accuratezza Categoria", f"{last_run['accuracy_cat']}%")
        c2.metric("Accuratezza Priorità", f"{last_run['accuracy_prio']}%")
        c3.metric("Accuratezza Destinatario", f"{last_run['accuracy_role']}%")
        c4.metric("Tasso Revisione Umana", f"{last_run['review_rate']}%")

        st.markdown("---")
        st.subheader("Storico Completo Esecuzioni Test")
        df_runs = pd.DataFrame(runs)[['id', 'run_date', 'variant', 'total_samples', 'accuracy_cat', 'accuracy_prio', 'accuracy_role', 'review_rate', 'avg_time_ms']]
        st.dataframe(df_runs, use_container_width=True)

# ---------------------------------------------------------
# PAGINA 7: FEEDBACK UTENTE
# ---------------------------------------------------------
elif page == "7. Feedback Utente":
    st.title("💬 Modulo Feedback e Note di Test (Design Thinking)")
    
    with st.form("feedback_form"):
        session_id = st.text_input("ID Sessione / Nome Utente", value="Tester_ITS4.0")
        worked_well = st.text_area("Cosa ha funzionato bene?")
        unclear_aspects = st.text_area("Cosa è risultato poco chiaro?")
        errors_found = st.text_area("Quali errori sono emersi?")
        suggested_improvements = st.text_area("Miglioramenti suggeriti")
        priority = st.selectbox("Priorità intervento suggerito", ["Bassa", "Media", "Alta", "Critica"])
        
        sub_fb = st.form_submit_button("Invia Feedback")
        if sub_fb:
            db.insert_feedback({
                "session_id": session_id,
                "worked_well": worked_well,
                "unclear_aspects": unclear_aspects,
                "errors_found": errors_found,
                "suggested_improvements": suggested_improvements,
                "priority": priority
            })
            st.success("Feedback registrato con successo!")

    st.markdown("---")
    st.subheader("Tabella Aggregata Feedback Raccolti")
    fbs = db.get_all_feedback()
    if fbs:
        st.dataframe(pd.DataFrame(fbs), use_container_width=True)

# ---------------------------------------------------------
# PAGINA 8: CONFRONTO A/B TEST
# ---------------------------------------------------------
elif page == "8. Confronto A/B Test":
    st.title("🅰️/🅱️ Confronto A/B Test Motori di Regole")
    st.markdown("Confronto tra Variante A (regole base) e Variante B (regole estese).")

    runs = db.get_test_runs()
    runs_A = [r for r in runs if r['variant'] == 'Variante A']
    runs_B = [r for r in runs if r['variant'] == 'Variante B']

    if not runs_A or not runs_B:
        st.info("Per effettuare il confronto A/B, esegui almeno un test con la Variante A e uno con la Variante B nel Modulo 5.")
    else:
        run_a = runs_A[0]
        run_b = runs_B[0]

        comp_data = {
            "Metrica": ["Campioni Totali", "Accuratezza Categoria (%)", "Accuratezza Priorità (%)", "Accuratezza Destinatario (%)", "Tasso Revisione (%)", "Tempo Medio (ms)"],
            "Variante A (Base)": [run_a['total_samples'], run_a['accuracy_cat'], run_a['accuracy_prio'], run_a['accuracy_role'], run_a['review_rate'], run_a['avg_time_ms']],
            "Variante B (Ottimizzata)": [run_b['total_samples'], run_b['accuracy_cat'], run_b['accuracy_prio'], run_b['accuracy_role'], run_b['review_rate'], run_b['avg_time_ms']]
        }
        
        df_comp = pd.DataFrame(comp_data)
        st.table(df_comp)
        st.caption("Nota: La validazione su dati sintetici costituisce una verifica preliminare e non sostituisce il test in ambiente di produzione.")

# ---------------------------------------------------------
# PAGINA 9: CONFIGURAZIONE REGOLE
# ---------------------------------------------------------
elif page == "9. Configurazione delle regole":
    st.title("⚙️ Visualizzazione e Configurazione Regole Locali")
    
    cfg_choice = st.selectbox("Seleziona File di Configurazione da Ispezionare:", ["config_rules_vA.json", "config_rules_vB.json"])
    
    with open(cfg_choice, "r", encoding="utf-8") as f:
        content = json.load(f)
    
    st.json(content)