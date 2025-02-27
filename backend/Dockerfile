FROM python:3.12-slim

WORKDIR /backend

COPY . .
RUN pip install -r requirements.txt

EXPOSE 8000

CMD ["sh", "-c", "if [ -f .env ]; then export $(cat .env | xargs); fi && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]