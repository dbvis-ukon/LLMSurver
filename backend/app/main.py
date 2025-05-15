import subprocess
from fastapi import FastAPI, UploadFile, Response, Form
import pandas as pd
import bibtexparser
from bibtexparser.bparser import BibTexParser
from bibtexparser.customization import convert_to_unicode
import openai
from openai import OpenAI
import sqlite3, json
import re

app = FastAPI()

def create_connection():
    connection = sqlite3.connect("survey.db")
    return connection

def create_tables():
    connection = create_connection()
    cursor = connection.cursor()
    cursor.execute(
    """
    CREATE TABLE IF NOT EXISTS Papers (
        paper_id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_title TEXT,
        publication_title TEXT,
        year TEXT,
        volume TEXT,
        issue TEXT,
        start_page TEXT,
        end_page TEXT,
        abstract TEXT,
        doi TEXT CHECK (doi LIKE "10.%" OR doi = ""),
        keywords TEXT,
        publisher TEXT,
        authors TEXT,
        whole TEXT
    );
    """
    )
    cursor.execute(
    """
    CREATE TABLE IF NOT EXISTS Models (
        model_id INTEGER PRIMARY KEY AUTOINCREMENT,
        host TEXT NOT NULL,
        name TEXT NOT NULL UNIQUE,
        key TEXT
    );
    """
    )
    cursor.execute(
    """
    CREATE TABLE IF NOT EXISTS ModelParameter (
        model_id INTEGER,
        parameter_name TEXT,
        value TEXT
    );
    """
    )
    # Type - 0: run, 1: sample
    cursor.execute(
    """
    CREATE TABLE IF NOT EXISTS RunInformation (
        run_id INTEGER PRIMARY KEY AUTOINCREMENT,
        alias TEXT,
        type INT CHECK (type IN (0, 1)),
        prompt TEXT,
        created NOT NULL DEFAULT current_timestamp
    );
    """
    )
    # Classification - 0: unknown, 1: include, 2: discard, 3: error
    cursor.execute(
    """
    CREATE TABLE IF NOT EXISTS RunEntries (
        run_entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
        paper_id INTEGER,
        run_id INTEGER,
        model_id INTEGER,
        classification INTEGER CHECK (classification IN (0, 1, 2, 3)),
        answer TEXT
    );
    """
    )
    connection.commit()
    connection.close()

create_tables()


async def preprocess_bibtex(entries):
    finished_entries = []
    for entry in entries:
        authors = []
        if 'author' in entry:
            # Change author format
            sub_authors = [sub_author.strip() for sub_author in entry['author'].split(' and ')]
            for sub_author in sub_authors:
                name_parts = sub_author.split(',')
                # Some names are just one part
                reordered_name = f"{name_parts[1] if (len(name_parts) == 2)  else ''} {name_parts[0]}"
                authors.append(reordered_name.strip())
        entry_type = entry.get('ENTRYTYPE', '').lower()
        fields = {
            'document_title': entry.get('title', ''),
            'publication_title': entry.get('booktitle', '') if entry_type == 'inproceedings' else entry.get('journal', '') if entry_type == 'article' else '',
            'year': entry.get('year', ''),
            'volume': entry.get('volume', ''),
            'issue': entry.get('number', ''),
            'start_page': entry.get('pages', '').split("–")[0] if entry.get('pages') else '',
            'end_page': entry.get('pages', '').split("–")[1] if entry.get('pages') and '–' in entry.get('pages') else '',
            'abstract': entry.get('abstract', ''),
            'doi': entry.get('doi', ''),
            'keywords': entry.get('keywords', ''),
            'publisher': entry.get('publisher', ''),
            'authors': ', '.join(authors) if authors else "No authors available",
            'whole': str(entry),
        }
        finished_entries.append(fields)
    df = pd.DataFrame(finished_entries)
    return df


@app.post("/api/insert_papers")
async def insert_papers(file: UploadFile = None, text: str = Form(None)):
    if file:
        try:
            content = await file.read()
            # Only bibtex possible
            if (file.content_type != 'text/x-bibtex' and not file.filename.endswith(".bib")):
                return {"error": "Wrong file format"}
            
            else:
                content = content.decode()
                content = content.replace("&", "").replace("\\","")
                content = str.encode(content, encoding="utf-8")
                parser = BibTexParser()
                parser.customization = convert_to_unicode
                bib = bibtexparser.loads(content, parser=parser)

                df = await preprocess_bibtex(bib.entries)

        except Exception as e:
            return {"error": "formatting file: " + str(e)}
        
    elif text:
        try:
            # Text is a DOI since bib starts with @
            if not text.startswith("@"):
                text = subprocess.check_output(["doi2bib", text]).decode('utf-8')
            parser = BibTexParser()
            parser.customization = convert_to_unicode
            bib = bibtexparser.loads(text, parser=parser)
            # DOI wasn't found/input isn't a DOI
            if (len(bib.entries) == 0):
                return {"error": "Text input has to be BibTeX or DOI"}

            df = await preprocess_bibtex(bib.entries)

        except Exception as e:
            return {"error": "formatting text: " + str(e)}
    
    try:
        connection = create_connection()
        df.to_sql("Papers", connection, if_exists='append', index=False)
        connection.commit()
        connection.close()

    except Exception as e:
        return {"error": "insert: " + str(e)}

    return {"message": f"Papers {f"from {file.filename}" if file else ""} added successfully"}


@app.get("/api/get_papers")
async def get_papers():
    try:
        connection = create_connection()
        connection.row_factory = sqlite3.Row
        cursor = connection.cursor()
        cursor.execute("SELECT paper_id, document_title, authors, doi, year, abstract FROM Papers")
        
        rows = cursor.fetchall()
        papers = [dict(row) for row in rows]
        
        connection.close()

    except Exception as e:
        return {"error": "getting papers: " + str(e)}
    
    return {"papers": papers}


@app.post("/api/set_model")
async def set_model(request_data: dict):
    host = request_data.get("host").strip()
    model = request_data.get("name").strip()
    key = request_data.get("key").strip()
    parameters = request_data.get("parameters")
    edit = request_data.get("edit")

    try:
        connection = create_connection()
        cursor = connection.cursor()
        # Change key and parameters for model that already exists
        if edit:
            cursor.execute("UPDATE Models SET host = ?, key = ? WHERE name = ?", (host, key, model))
            cursor.execute("SELECT model_id FROM Models WHERE name = ?", (model,))
            model_id = cursor.fetchone()[0]
            cursor.execute("DELETE FROM ModelParameter WHERE model_id = ?", (model_id,))
        else:
            cursor.execute("INSERT INTO Models(host, name, key) VALUES(?, ?, ?)", (host, model, key))
            connection.commit()
            model_id = cursor.lastrowid
        for par in parameters:
            if par["name"] != "" and par["value"] != "":
                cursor.execute("INSERT INTO ModelParameter(model_id, parameter_name, value) VALUES(?, ?, ?)", (model_id, par["name"], par["value"]))
        connection.commit()
        connection.close()

    except Exception as e:
        return {"error": "setting model: " + str(e)}

    return {"model_id": model_id, "name": model}


@app.get("/api/get_models")
async def get_models():
    try:
        connection = create_connection()
        connection.row_factory = sqlite3.Row
        cursor = connection.cursor()
        cursor.execute("SELECT * FROM Models")
        
        rows = cursor.fetchall()
        models = [dict(row) for row in rows]
        
        connection.close()

    except Exception as e:
        return {"error": "getting chosen models: " + str(e)}
    
    return {"models": models}


@app.post("/api/get_parameters")
async def get_run(request_data: dict):
    model_id = request_data.get("model_id")
    try:
        connection = create_connection()
        connection.row_factory = sqlite3.Row
        cursor = connection.cursor()
        cursor.execute("SELECT parameter_name AS name, value FROM ModelParameter WHERE model_id = ?", (model_id,))
        rows = cursor.fetchall()
        parameters = [dict(row) for row in rows]
        connection.close()

    except Exception as e:
        return {"error": "getting parameters: " + str(e)}

    return {"parameters": parameters}


@app.post("/api/set_run")
async def set_run(request_data: dict):
    prompt = request_data.get("prompt").strip()
    ids = request_data.get("ids")
    name = request_data.get("name").strip()

    try:
        connection = create_connection()
        cursor = connection.cursor()
        cursor.execute("INSERT INTO RunInformation(alias, type, prompt) VALUES(?, ?, ?)", (name, 1 if ids else 0, prompt))
        connection.commit()
        run_id = cursor.lastrowid
        connection.close()
    except Exception as e:
        return {"error": "inserting run: " + str(e)}

    return {"run": run_id}


@app.post("/api/delete_run")
async def delete_run(request_data: dict):
    run_id = request_data.get("run_id")

    try:
        connection = create_connection()
        cursor = connection.cursor()
        cursor.execute("DELETE FROM RunInformation WHERE run_id = ?", (run_id,))
        cursor.execute("DELETE FROM RunEntries WHERE run_id = ?", (run_id,))
        connection.commit()
        connection.close()
    except Exception as e:
        return {"error": "deleting run: " + str(e)}

    return {"run": run_id}


@app.post("/api/classify")
async def classify(request_data: dict):
    model_name = request_data.get("model")
    prompt = request_data.get("prompt").strip()
    paper_id = request_data.get("paper_id")
    run_id = request_data.get("run_id")

    try:
        connection = create_connection()
        connection.row_factory = sqlite3.Row
        cursor = connection.cursor()
        # Get paper info
        cursor.execute("SELECT document_title, abstract FROM Papers WHERE paper_id = ?", (paper_id,))
        row = cursor.fetchone()
        paper = dict(row)
        # Get model info
        cursor.execute("SELECT * FROM Models WHERE name = ?", (model_name,))
        row = cursor.fetchone()
        model = dict(row)
        # Get parameter info
        cursor.execute("SELECT * FROM ModelParameter WHERE model_id = ?", (model["model_id"],))
        rows = cursor.fetchall()
        result = [dict(row) for row in rows]
        parameters = {par["parameter_name"]: par["value"] for par in result}
    except Exception as e:
        return {"error": "getting database info: " + str(e), "paper_id": paper_id, "model_name": model_name}
     
    try:
        # Prompt including the predetermined part and information about the current paper to send to LLM        
        text = prompt + f"\n\nBelow is the title and abstract. You must only answer with INCLUDE or DISCARD and a 2-sentence reason of why.\n\nTitle:\n'{re.escape(paper["document_title"])}'.\n\nAbstract:\n'{re.escape(paper["abstract"])}'"
                        
        client = OpenAI(
            base_url=model["host"] + "",
            api_key=model["key"]
        )
        # Send prompt to current model with parameters from the database
        response = client.chat.completions.create(
            model=model["name"],
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": text}
                    ],
                    **parameters
                }
            ],
        )

        answer = response.choices[0].message.content
        answer = re.sub(r'<think>.*?</think>', '', answer, flags=re.DOTALL)
       
        # Extract classification from the response - 1: include, 2: discard, 3: error
        classification = 0
        if "include" in answer.lower():
            classification += 1
        
        if "discard" in answer.lower():
            classification += 2
            
        if classification == 0:
            classification = 3
            
        #classification = 1 if "include" in answer.lower() else 2 if "discard" in answer.lower() else 3
    except (openai.OpenAIError, Exception) as e:
        classification = 3
        answer = str(e)
    
    try:
        cursor.execute("INSERT INTO RunEntries(paper_id, run_id, model_id, classification, answer) VALUES(?, ?, ?, ?, ?)", (paper_id, run_id, model["model_id"], classification, answer))
        connection.commit()
        connection.close()
    except Exception as e:
        return {"error": "inserting run: " + str(e), "paper_id": paper_id, "model_name": model_name}

    return {"paper_id": paper_id, "model_name": model_name, "classification": classification, "answer": answer}


@app.post("/api/get_run")
async def get_run(request_data: dict):
    id = request_data.get("id")
    # Data is condensed into an object here for ease of use in the frontend
    try:
        connection = create_connection()
        connection.row_factory = sqlite3.Row
        cursor = connection.cursor()
        cursor.execute(
            f"""
            SELECT
                Papers.paper_id,
                Papers.document_title,
                Papers.authors,
                Papers.doi,
                Papers.year,
                Papers.abstract,
                GROUP_CONCAT(
                    json_object(
                        'model_name', Models.name,
                        'classification', RunEntries.classification,
                        'answer', RunEntries.answer
                    )
                ) AS model_responses
            FROM RunEntries
            JOIN Papers ON RunEntries.paper_id = Papers.paper_id
            JOIN Models ON RunEntries.model_id = Models.model_id
            WHERE RunEntries.run_id = ?
            GROUP BY Papers.paper_id
            """,
            (id,)
        )
        rows = cursor.fetchall()

        results = []
        for row in rows:
            paper = dict(row)
            paper["model_responses"] = json.loads(f"[{paper['model_responses']}]")
            results.append(paper)
        connection.close()

    except Exception as e:
        return {"error": "getting run: " + str(e)}

    return {"run": results}


@app.get("/api/get_runs")
async def get_runs():
    try:
        connection = create_connection()
        connection.row_factory = sqlite3.Row
        cursor = connection.cursor()
        cursor.execute("SELECT * FROM RunInformation")
        rows = cursor.fetchall()
        connection.close()

    except Exception as e:
        return {"error": "getting chosen models: " + str(e)}
    
    return {"runs": rows}


@app.post("/api/export_papers")
def export_papers(request_data: dict):
    run_id = request_data.get("run_id")
    alias = request_data.get("alias")
    consensus = request_data.get("consensus")

    try:
        connection = create_connection()
        connection.row_factory = sqlite3.Row
        cursor = connection.cursor()
        # No run is selected, the export includes the papers only
        if run_id == -1:
            cursor.execute(
                """
                SELECT
                    paper_id,
                    document_title,
                    publication_title,
                    year,
                    volume,
                    issue,
                    start_page,
                    end_page,
                    abstract,
                    doi,
                    keywords,
                    publisher,
                    authors
                FROM Papers
                """
            )
            
            rows = cursor.fetchall()
            papers = [dict(row) for row in rows]
        # Papers with additional information from the LLM are exported for selected run
        else:
            cursor.execute(
                f"""
                SELECT
                    Papers.paper_id,
                    Papers.document_title,
                    Papers.publication_title,
                    Papers.year,
                    Papers.volume,
                    Papers.issue,
                    Papers.start_page,
                    Papers.end_page,
                    Papers.abstract,
                    Papers.doi,
                    Papers.keywords,
                    Papers.publisher,
                    Papers.authors,
                    GROUP_CONCAT(
                        json_object(
                            'model_name', Models.name,
                            'classification', RunEntries.classification,
                            'answer', RunEntries.answer
                        )
                    ) AS model_responses
                FROM RunEntries
                JOIN Papers ON RunEntries.paper_id = Papers.paper_id
                JOIN Models ON RunEntries.model_id = Models.model_id
                WHERE RunEntries.run_id = ?
                GROUP BY Papers.paper_id
                """,
                (run_id,)
            )
            rows = cursor.fetchall()

            papers = []
            for i, row in enumerate(rows):
                paper = dict(row)
                paper["model_responses"] = json.loads(f"[{paper['model_responses']}]")
                paper["consensus"] = consensus[i]
                papers.append(paper)
            connection.close()

        df = pd.DataFrame(papers)
        csv_data = df.to_csv(index=False)
        return Response(content=csv_data, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={alias}.csv"})

    except Exception as e:
        return {"error": "exporting papers: " + str(e)}