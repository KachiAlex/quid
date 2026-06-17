from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class Transaction(BaseModel):
    id: str
    description: str
    amount: float
    currency: str
    date: str
    merchant_name: Optional[str] = None

class ClassifiedProduct(BaseModel):
    transaction_id: str
    product_type: str
    provider_name: str
    annual_cost: float
    frequency: str
    confidence_score: float

class ClassificationRequest(BaseModel):
    transactions: List[Transaction]
    user_id: str

class ClassificationResponse(BaseModel):
    products: List[ClassifiedProduct]
    processed_at: str

@router.post("/", response_model=ClassificationResponse)
async def classify_transactions(request: ClassificationRequest):
    """
    Classify a batch of transactions into financial product categories.
    """
    # TODO: implement rule-based classification + ML layer
    return ClassificationResponse(
        products=[],
        processed_at="2026-05-30T00:00:00Z"
    )
