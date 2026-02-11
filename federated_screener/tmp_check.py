from blockchain.logger import get_safe_blockchain_logger
import json
bl = get_safe_blockchain_logger()
print(json.dumps(bl.health_check()))
